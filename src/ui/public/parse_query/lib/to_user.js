define(function (require) {
  var _ = require('lodash');
  var angular = require('angular');
  var QueryFormatter = require('ui/parse_query/lib/queryFormatter');
  var useLegacy = true;

  /**
   * Take text from the model and present it to the user as a string
   *
   * @param {text}
   *          model value
   * @returns {string}
   */
  function toUser(text) {
    if (text == null) {
      return '';
    }
    if (_.isObject(text)) {
      if (text.query_string) {
        return toUser(text.query_string.query);
      }
      if (useLegacy) {
        return angular.toJson(text);
      } else {
        return QueryFormatter.formatQuery(text);
      }
    }
    return '' + text;
  }
  ;

  toUser.setIndexPattern = function (fieldMap) {
    QueryFormatter.fieldDictionary = fieldMap;
  };

  toUser.setUseLEgacy = function (legacy) {
    useLegacy = legacy;
  };

  return toUser;
});
