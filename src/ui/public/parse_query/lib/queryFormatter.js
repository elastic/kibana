define(function () {
  var moment = require('moment');

  QueryFormatter.fieldDictionary = {};

  function QueryFormatter() {
  }

  QueryFormatter.formatQuery = function (jsonObject) {
    if (jsonObject.query) {
      return fromQuery(jsonObject.query);
    }
  };

  function fromQuery(query) {
    if (query.match_all) {
      return '*';
    } else if (query.nested) {
      if (query.nested.query.must_not) {
        return 'NOT EXISTS ' + fromQuery(query.nested.query.must_not);
      } else if (query.nested.query.bool && query.nested.query.bool.must_not) {
        return '(NOT EXISTS ' + fromQuery(query.nested.query.bool.must_not) + ')';
      }
      return 'EXISTS ' + fromQuery(query.nested.query);
    } else if (query.term) {
      return fromTerm(query.term);
    } else if (query.bool) {
      return fromBool(query.bool);
    } else if (query.range) {
      return fromRange(query.range);
    } else if (query.must_not) {
      return fromMustNot(query.must_not);
    } else if (query.filtered) {
      return fromFiltered(query.filtered);
    }

    throw 'Unable to reverse parse';
  }

  function fromFiltered(filtered) {
    if (filtered.filter.missing) {
      return filtered.filter.missing.field + ' IS NULL';
    }
  }

  function fromMustNot(mustNot) {
    return 'NOT ' + fromQuery(mustNot);
  }

  function fromTerm(term) {
    var keyNames = Object.keys(term);
    var value = valueToString(keyNames[0], term[keyNames[0]]);
    return keyNames[0] + '=' + value;
  }

  function fromRange(range) {
    var fieldName = Object.keys(range)[0];
    var rangeObj = range[fieldName];
    if (rangeObj.from) {
      if (rangeObj.to) {
        return fieldName + ' IN ' + (rangeObj.include_lower ? '(' : '[')
            + valueToString(fieldName, rangeObj.from) + ','
            + valueToString(fieldName, rangeObj.to)
            + (rangeObj.include_upper ? ')' : ']');
      }
      return fieldName + (rangeObj.include_lower ? '>=' : '>')
          + valueToString(fieldName, rangeObj.from);
    } else {
      return fieldName + (rangeObj.include_upper ? '<=' : '<')
          + valueToString(fieldName, rangeObj.to);
    }
  }

  function fromBool(bool) {
    var returnValue = '(';
    var mustUsed = false;
    var i;

    if (bool.must === undefined && bool.should === undefined) {
      return fromQuery(bool);
    }

    if (bool.must) {
      for (i = 0; i < bool.must.length; i++) {
        if (i > 0) {
          returnValue += ' AND ';
        }
        returnValue += fromQuery(bool.must[i]);
      }
      mustUsed = true;
    }

    if (bool.should) {
      /**
       * Special case, if all of the fieldNames in the should are the same, this
       * is really an IN clause
       */
      var isIn = false;
      if (bool.should.length > 1 && bool.should[0].term) {
        isIn = true;
        var fieldName = Object.keys(bool.should[0].term)[0];
        for (i = 1; i < bool.should.length; i++) {
          if (bool.should[i].term === undefined || fieldName !== Object.keys(bool.should[i].term)[0]) {
            isIn = false;
            break;
          }
        }
        if (isIn) {
          if (bool.must === undefined) {
            returnValue = '';
          }
          returnValue += fieldName + ' IN {';
          for (i = 0; i < bool.should.length; i++) {
            if (i > 0) {
              returnValue += ',';
            }
            returnValue += valueToString(fieldName,
                bool.should[i].term[fieldName]);
          }
          returnValue += '}';
          if (bool.must === undefined) {
            return returnValue;
          }
        }
      }
      if (!isIn) {
        for (i = 0; i < bool.should.length; i++) {
          if (i > 0 || mustUsed) {
            returnValue += ' OR ';
          }

          returnValue += fromQuery(bool.should[i]);
        }
      }
    }
    returnValue += ')';
    return returnValue;
  }

  function valueToString(name, value) {
    var field = QueryFormatter.fieldDictionary[name];
    switch (field.type) {
      case 'date':
        return moment(value).utc().format('YYYY-MM-DDTHH:mm:ss.SSS') + 'Z';
        break;
      case 'string':
        return '"' + value + '"';
        break;
      default:
        return value;
        break;
    }
  }
  return QueryFormatter;

});
