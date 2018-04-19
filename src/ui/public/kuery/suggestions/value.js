import { flatten, memoize } from 'lodash';
import chrome from '../../chrome';
import { escapeQuotes } from './escape_kuery';

const baseUrl = chrome.addBasePath('/api/kibana/suggestions/values');
const type = 'value';

export function getSuggestionsProvider({ $http, config, indexPatterns }) {
  const allFields = flatten(indexPatterns.map(indexPattern => indexPattern.fields.raw));
  const requestSuggestions = memoize((query, field) => {
    const queryParams = { query, field: field.name };
    return $http.post(`${baseUrl}/${field.indexPattern.title}`, queryParams);
  }, resolver);
  const shouldSuggestValues = config.get('filterEditor:suggestValues');

  return function getValueSuggestions({ start, end, prefix, suffix, fieldName }) {
    const fields = allFields.filter(field => field.name === fieldName);
    const query = `${prefix}${suffix}`;

    const suggestionsByField = fields.map(field => {
      if (field.type === 'boolean') {
        return wrapAsSuggestions(start, end, query, ['true', 'false']);
      } else if (!shouldSuggestValues || !field.aggregatable || field.type !== 'string') {
        return [];
      }

      return requestSuggestions(query, field).then(({ data }) => {
        const quotedValues = data.map(value => `"${escapeQuotes(value)}"`);
        return wrapAsSuggestions(start, end, query, quotedValues);
      });
    });

    return Promise.all(suggestionsByField)
      .then(suggestions => flatten(suggestions));
  };
}

function wrapAsSuggestions(start, end, query, values) {
  return values
    .filter(value => value.toLowerCase().includes(query.toLowerCase()))
    .map(value => {
      const text = `${value} `;
      return { type, text, start, end };
    });
}

function resolver(query, field) {
  // Only cache results for a minute
  const ttl = Math.floor(Date.now() / 1000 / 60);
  return [ttl, query, field.indexPattern.title, field.name].join('|');
}
