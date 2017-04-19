import _ from 'lodash';
import { DecorateQueryProvider } from 'ui/courier/data_source/_decorate_query';

export function ParseQueryLibFromUserProvider(es, Private) {
  const decorateQuery = Private(DecorateQueryProvider);

  /**
   * Take text from the user and make it into a query object
   * @param {text} user's query input
   * @returns {object}
   */
  return function (text) {
    function getQueryStringQuery(text) {
      return decorateQuery({ query_string: { query: text } });
    }

    const matchAll = getQueryStringQuery('*');

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
}

