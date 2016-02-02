var scope;

if (typeof require !== 'undefined') {
  scope = exports;
}

scope.fieldDictionary = {};

scope.moment = require('moment');
scope.errors = require('ui/errors');

scope.NOVALUE = {};

scope.Query = function (expression) {
  this.expression = expression;
};

scope.Query.prototype = {
  toJson : function () {
    return '{"query":' + this.expression.toJson() + '}';
  }
};

scope.MatchAll = function () {
};

scope.MatchAll.prototype = {
  toJson : function () {
    return '{ "match_all": {} }';
  }
};

scope.Missing = function (fieldName) {
  this.fieldName = fieldName;
};

scope.Missing.prototype = {
  toJson : function () {
    return '{"filtered":{"filter":{"missing":{"field":"' + this.fieldName
        + '"}}}}';
  }
};

scope.SetLiteral = function (value) {
  this.set = [ value ];
};

scope.SetLiteral.prototype = {
  add : function (value) {
    this.set.push(value);
  }
};

scope.RangeLiteral = function (from, to, includeLower, includeUpper) {
  this.from = from;
  this.to = to;
  this.includeLower = includeLower;
  this.includeUpper = includeUpper;
};

scope.Range = function (field, rangeLiteral) {
  this.field = field;
  this.rangeLiteral = rangeLiteral;
};

scope.Range.prototype = {
  toJson : function () {
    return '{"range":{"' + this.field + '":{"from":' + this.rangeLiteral.from
        + ',"to":' + this.rangeLiteral.to + ',"include_lower":'
        + this.rangeLiteral.includeLower + ',"include_upper":'
        + this.rangeLiteral.includeUpper + '}}}';
  }
};

scope.Term = function (field, operation, value) {
  if (scope.fieldDictionary[field] === undefined) {
    throw new scope.errors.FieldNotFoundInSelectedIndex(field);
  }
  this.field = field;
  this.operation = operation;
  this.value = value;
};

scope.Term.prototype = {
  toJson : function () {
    switch (this.operation) {
      case '=':
        return '{"term":{"' + this.field + '":' + this.value + '}}';
        break;
      case '>':
        return '{"range":{"' + this.field + '":{"from":' + this.value
            + ',"to":null,"include_lower":false,"include_upper":true}}}';
        break;
      case '<':
        return '{"range":{"' + this.field + '":{"from":null,"to":' + this.value
            + ',"include_lower":true,"include_upper":false}}}';
        break;
      case '>=':
        return '{"range":{"' + this.field + '":{"from":' + this.value
            + ',"to":null,"include_lower":true,"include_upper":true}}}';
        break;
      case '<=':
        return '{"range":{"' + this.field + '":{"from":null,"to":' + this.value
            + ',"include_lower":true,"include_upper":true}}}';
        break;
      case '~=':
        return '{"wildcard":{"' + this.field + '":' + this.value + '}}';
        break;
      default:
        break;
    }
  }
};

scope.BoolExpr = function () {
  this.andExpr = [];
  this.orExpr = [];
};

scope.BoolExpr.prototype = {
  and : function (left, right) {
    if (left !== this) {
      this.andExpr.push(left);
    }
    if (right !== this) {
      this.andExpr.push(right);
    }
  },

  or : function (left, right) {
    if (left !== this) {
      this.orExpr.push(left);
    }
    if (right !== this) {
      this.orExpr.push(right);
    }
  },

  toJson : function () {
    var json = '{"bool":';
    var i;

    if (this.andExpr.length > 0) {
      json += '{"must":[';
      for (i = 0; i < this.andExpr.length; i++) {
        if (i > 0) {
          json += ',';
        }
        json += this.andExpr[i].toJson();
      }
      json += ']';
      if (this.orExpr.length === 0) {
        json += '}';
      }
    }
    if (this.andExpr.length > 0 && this.orExpr.length > 0) {
      json += ',';
    }
    if (this.orExpr.length > 0) {
      if (this.andExpr.length === 0) {
        json += '{';
      }
      json += '"should":[';
      for (i = 0; i < this.orExpr.length; i++) {
        if (i > 0) {
          json += ',';
        }
        json += this.orExpr[i].toJson();
      }
      json += ']}';
    }
    json += '}';
    return json;
  }
};

scope.Not = function (expression) {
  this.expression = expression;
};

scope.Not.prototype = {
  toJson : function () {
    return '{"bool":{"must_not":' + this.expression.toJson() + '}}';
  }
};

scope.ScopedExpr = function (expression) {
  this.expression = expression;
};

scope.ScopedExpr.prototype = {
  toJson : function () {
    return this.expression.toJson();
  }
};