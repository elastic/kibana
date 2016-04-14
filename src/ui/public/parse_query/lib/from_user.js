define(function (require) {
  let _ = require('lodash');
  return function GetQueryFromUser(es, Private) {
    let decorateQuery = Private(require('ui/courier/data_source/_decorate_query'));

    /**
     * Take text from the user and make it into a query object
     * @param {text} user's query input
     * @returns {object}
     */
    return function (text) {
      function getQueryStringQuery(text) {
        return decorateQuery({query_string: {query: text}});
      }

      let matchAll = getQueryStringQuery('*');

      // If we get an empty object, treat it as a *
      if (_.isObject(text)) {
        if (Object.keys(text).length) {
          return text;
        } else {
          return matchAll;
        }
      }

      // Nope, not an object.
      text = (text || '').trim();
      if (text.length === 0) return matchAll;

      if (text[0] === '{') {
        try {
          return JSON.parse(text);
        } catch (e) {
          return getQueryStringQuery(text);
        }
      } else {
        return getQueryStringQuery(text);
      }
    };
  };
});

