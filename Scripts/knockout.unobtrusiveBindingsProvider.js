(function (instance) {
    instance["getBindingsString"] = function (node, bindingContext) { return node.getBindingsString(bindingContext, ko.bindingProvider["bindings"]); };
    instance.nodeHasBindings = function (node) { return node.nodeType === 1 && !!(node.id || node.name || node.className); };
})(ko.bindingProvider.instance);
var Bindings = (function () {
    function Bindings() {
    }
    Bindings.find = function (source, targets) {
        var name = "", value = undefined;
        for (var i = 0, l = targets.length; i < l && value === undefined; i++) {
            name = targets[i];
            if (name) {
                value = source[name];
                if (value === undefined && /-/.test(name)) {
                    var names = name.split(/-/g);
                    for (var j = 0, m = names.length; j < m; j++) {
                        name = names[j];
                        value = source[name];
                        if (value === undefined) {
                            break;
                        }
                        else if (j < m - 1) {
                            if (ko.isObservable(value)) {
                                names[j] += "()";
                                value = ko.unwrap(value);
                            }
                            if (value && typeof value === "object") {
                                source = value;
                            }
                            else {
                                value = undefined;
                                break;
                            }
                        }
                    }
                    name = names.join(".");
                }
            }
        }
        return value === undefined ? null : { name: name, value: value };
    };
    Bindings.from = function (obj) {
        switch (typeof obj) {
            case "string": return obj.valueOf();
            case "object":
                if (obj) {
                    var bindings = [];
                    for (var name in obj) {
                        if (obj.hasOwnProperty(name)) {
                            var v = obj[name];
                            if (!(v === null || v === undefined)) {
                                if (typeof v === "string") {
                                    v = "'" + v + "'";
                                }
                                else if (typeof v === "object") {
                                    v = "{" + Bindings.from(v) + "}";
                                }
                                else if (typeof v === "function") {
                                    window[v = "fn" + Date.now()] = obj[name];
                                }
                                bindings.push(name + ":" + v);
                            }
                        }
                    }
                    return bindings.join(",");
                }
            default:
                return null;
        }
    };
    Bindings.get = function (r, node) {
        var name = r.name, value = r.value, binding = "text", nodeName = node.nodeName.toLowerCase();
        if (!value) {
            return null;
        }
        switch (nodeName) {
            case "input":
            case "select":
                binding = "value";
        }
        var process = function (value) {
            if (!value) {
                return;
            }
            if (value instanceof Array) {
                binding = nodeName === "select" ? "selectedOptions" : "foreach";
            }
            else if (typeof value === "object" && binding === "text") {
                binding = "with";
            }
        };
        ko.isObservable(value) ? (function () {
            process(value.peek());
            binding = value.binding || binding;
        })() : value instanceof Function ? binding = "click" : process(value);
        var b = value.bindings;
        if (b) {
            if (typeof b !== "string") {
                if (b.override) {
                    return b.value;
                }
                b = Bindings.from(b.value);
            }
            binding = "" + b + "," + binding;
        }
        return binding + ":" + name;
    };
    return Bindings;
})();
ko.extenders.binding = function (target, binding) {
    return ko.utils.extend(target, { binding: binding });
};
ko.extenders.bindings = function (target, bindings) {
    return ko.utils.extend(target, { bindings: bindings });
};
HTMLElement.prototype.getBindingsString = function (bindingContext, bindings) {
    if (this.nodeType === 1) {
        var path = this.path, result = Node["cache"][path];
        if (result === undefined) {
            var names = [this.id, this.name].concat(this.className.replace(/^(\s|\u00A0)+|(\s|\u00A0)+$/g, "").replace(/(\s|\u00A0){2,}/g, " ").split(/(\s|\u00A0)/g));
            if (names.length) {
                var data = bindingContext.$data, overridden = undefined, r, i, l;
                var process = function (bindings) {
                    if (!(bindings && bindings.length)) {
                        return;
                    }
                    for (i = 0, l = bindings.length; i < l; i++) {
                        if (!bindings[i]) {
                            continue;
                        }
                        r = Bindings.find(bindings[i], names);
                        if (r) {
                            var v = r.value;
                            if (v && v.bindings) {
                                overridden = v.override;
                                v = v.bindings;
                            }
                            result = Bindings.from(v);
                        }
                        if (overridden) {
                            break;
                        }
                    }
                };
                process([bindings, data.bindings]);
                if (!overridden) {
                    r = Bindings.find(data, names);
                    var parents = bindingContext.$parents;
                    for (i = 0, l = parents.length; i < l && !r; i++) {
                        r = Bindings.find(parents[i], names);
                        if (r) {
                            r.name = "$parents[" + i + "]." + r.name;
                        }
                    }
                    if (r) {
                        var s = Bindings.get(r, this);
                        result ? result += "," + s : result = s;
                    }
                }
                Node["cache"][path] = result;
            }
        }
        if (result && location.hostname === "localhost") {
            this.setAttribute("data-bind", result);
        }
        return result;
    }
    return undefined;
};
Node["cache"] = {};
Object.defineProperty(HTMLBodyElement.prototype, "path", {
    get: function () {
        return "";
    }
});
Object.defineProperty(Node.prototype, "path", {
    get: function () {
        var value = this.nodeName.toLowerCase();
        if (this.id) {
            value += "#" + this.id;
        }
        if (this.name) {
            value += ":" + this.name;
        }
        if (this.className) {
            value += "." + this.className.replace(/\s/g, ".");
        }
        return "" + this.parentNode.path + "/" + value;
    }
});
