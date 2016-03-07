var scope;

if (typeof require !== 'undefined') {
  scope = exports;
}

scope.fieldDictionary = {};

scope.moment = require('moment');
scope.errors = require('ui/errors');
scope._ = require('lodash');

function getMapping(fieldName) {
  if (scope.fieldDictionary) {
    var mapping = scope.fieldDictionary[fieldName];
    if (mapping === undefined) {
      throw new scope.errors.FieldNotFoundInSelectedIndex(fieldName);
    }
    return mapping;
  }
  return undefined;
}

function validateValue(mapping, value) {
  var temp;
  if (mapping) {
    switch (mapping.type) {
      case 'string':
        if (!scope._.isString(value)) {
          throw new scope.errors.InvalidValueForField(mapping.name, mapping.type, value);
        }
        return value;
        break;
      case 'date':
        if (!value._isAMomentObject) {
          throw new scope.errors.InvalidValueForField(mapping.name, mapping.type, value);
        }
        return value.valueOf();
        break;
      case 'ip':
        return '"' + value + '"';
        break;
      case 'number':
        if (!scope._.isNumber(value)) {
          throw new scope.errors.InvalidValueForField(mapping.name, mapping.type, value);
        }
        return value;
        break;
      case 'boolean':
        if (!scope._.isBoolean(value)) {
          throw new scope.errors.InvalidValueForField(mapping.name, mapping.type, value);
        }
        return value;
        break;
      case 'geo_point':
        // check that the string value is formatted as a geo point
        temp = value.split(',');
        if (parseFloat(temp[0]) === NaN || parseFloat(temp[1]) === NaN) {
          throw new scope.errors.InvalidValueForField(mapping.name, mapping.type, value);
        }
        return value;
        break;
    }
  }
  return value;
}


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
  var mapping = getMapping(fieldName);
  this.fieldName = fieldName;
  this.nestedPath = (mapping ? mapping.nestedPath : undefined);
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
  var mapping = getMapping(field);
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
  var mapping = getMapping(field);
  this.field = field;
  this.operation = operation;
  this.value = validateValue(mapping, value);
  this.nestedPath = (mapping ? mapping.nestedPath : undefined);
};

scope.Term.prototype = {
  toJson : function (ignoreNested) {
    var jsonString = '';
    if (this.nestedPath) {
      jsonString = '{"nested":{"path":"' + this.nestedPath + '","query":';
    }
    switch (this.operation) {
      case '=':
        jsonString += '{"term":{"' + this.field + '":' + this.value + '}}';
        break;
      case '>':
        jsonString += '{"range":{"' + this.field + '":{"from":' + this.value
            + ',"to":null,"include_lower":false,"include_upper":true}}}';
        break;
      case '<':
        jsonString += '{"range":{"' + this.field + '":{"from":null,"to":' + this.value
            + ',"include_lower":true,"include_upper":false}}}';
        break;
      case '>=':
        jsonString += '{"range":{"' + this.field + '":{"from":' + this.value
            + ',"to":null,"include_lower":true,"include_upper":true}}}';
        break;
      case '<=':
        jsonString += '{"range":{"' + this.field + '":{"from":null,"to":' + this.value
            + ',"include_lower":true,"include_upper":true}}}';
        break;
      case '~=':
        jsonString += '{"wildcard":{"' + this.field + '":' + this.value + '}}';
        break;
      default:
        break;
    }
    if (this.nestedPath) {
      jsonString += '}}';
    }
    return jsonString;
  }
};

scope.BoolExpr = function () {
  this.andExpr = [];
  this.orExpr = [];
  this.nestedPath;
};

scope.BoolExpr.prototype = {

  sameNested : function (left, right) {
    if (left.nestedPath === undefined && right.nestedPath === undefined) {
      return true;
    }
    if (left.nestedPath && right.nestedPath && left.nestedPath === right.nestedPath) {
      if (left instanceof scope.ScopedExpr && left.exists === true) {
        return false;
      } else if (right instanceof scope.ScopedExpr && right.exists === true) {
        return false;
      } else if (left instanceof scope.Not && left.expression instanceof scope.ScopedExpr && left.expression.exists === true) {
        return false;
      } else if (right instanceof scope.Not && right.expression instanceof scope.ScopedExpr && right.expression.exists === true) {
        return false;
      }
      return true;
    }
    return false;
  },

  setAnd : function (andExprs) {
    this.andExpr = andExprs;
  },

  setOr : function (orExprs) {
    this.orExpr = orExprs;
  },

  and : function (left, right) {
    var newAnd;
    var newBool;
    // If neither side is a Bool/this object, this means this is the first
    // set of expressions to be AND/OR together
    if (left !== this && right !== this) {
      if (this.sameNested(left, right)) {
        this.nestedPath = left.nestedPath;
        left.nestedPath = undefined;
        right.nestedPath = undefined;
      }
      this.andExpr.unshift(right);
      this.andExpr.unshift(left);
      return;
    }
    if (left !== this) {
      newAnd = left;
    } else {
      newAnd = right;
    }

    if (this.sameNested(this, newAnd)) {
      newAnd.nestedPath = undefined;
      this.andExpr.unshift(newAnd);
    } else {
      // Create a new BoolExpr move our contents to the left side, put the newAnd to the right, and set it in
      // our and.
      newBool = new scope.BoolExpr();
      newBool.setAnd(this.andExpr);
      newBool.nestedPath = this.nestedPath;
      this.nestedPath = undefined;
      this.andExpr = [newAnd, newBool];
    }

  },

  or : function (left, right) {
    var newOr;
    var newBool;

    // If neither side is a Bool/this object, this means this is the first
    // set of expressions to be AND/OR together
    if (left !== this && right !== this) {
      if (this.sameNested(left, right)) {
        this.nestedPath = left.nestedPath;
        left.nestedPath = undefined;
        right.nestedPath = undefined;
      }
      this.orExpr.unshift(right);
      this.orExpr.unshift(left);
      return;
    }
    if (left !== this) {
      newOr = left;
    } else {
      newOr = right;
    }

    if (this.sameNested(this, newOr)) {
      newOr.nestedPath = undefined;
      this.orExpr.unshift(newOr);
    } else {
      // Create a new BoolExpr move our contents to the left side, put the newAnd to the right, and set it in
      // our and.
      newBool = new scope.BoolExpr();
      newBool.setOr(this.orExpr);
      newBool.nestedPath = this.nestedPath;
      this.nestedPath = undefined;
      this.orExpr = [newOr, newBool];
    }
  },

  toJson : function () {
    var json = '';
    var i;

    if (this.nestedPath) {
      json = '{"nested":{"path":"' + this.nestedPath + '","query":';
    }

    json += '{"bool":';

    if (this.andExpr.length > 0) {
      json += '{"must":[';
      for (i = 0; i < this.andExpr.length; i++) {
        if (i > 0) {
          json += ',';
        }
        if (this.andExpr[i].nestedPath === this.nestedPath) {
          this.andExpr[i].nestedPath = undefined;
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
        if (this.orExpr[i].nestedPath === this.nestedPath) {
          this.orExpr[i].nestedPath = undefined;
        }
        json += this.orExpr[i].toJson();
      }
      json += ']}';
    }
    json += '}';
    if (this.nestedPath) {
      json += '}}';
    }
    return json;
  }
};

scope.Not = function (expression) {
  this.expression = expression;
  this.nestedPath = expression.nestedPath;
  this.expression.nestedPath = undefined;
};

scope.Not.prototype = {
  toJson : function () {
    var json = '{"bool":{"must_not":' + this.expression.toJson() + '}}';
    if (this.nestedPath) {
      json = '{"nested":{"path":"' + this.nestedPath + '","query":' + json + '}}';
    }
    return json;
  }
};

scope.ScopedExpr = function (expression) {
  this.expression = expression;
  this.nestedPath = expression.nestedPath;
  this.expression.nestedPath = undefined;
  this.exists = false;
};

scope.ScopedExpr.prototype = {

  toJson : function () {
    if (this.nestedPath) {
      return '{"nested":{"path":"' + this.nestedPath + '","query":' + this.expression.toJson() + '}}';
    }
    return this.expression.toJson();
  }
};