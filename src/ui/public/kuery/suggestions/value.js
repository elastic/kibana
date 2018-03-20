import { flatten, memoize, uniq } from 'lodash';
import chrome from 'ui/chrome';
import { escapeQuotes } from './escape_kuery';

const baseUrl = chrome.addBasePath('/api/kibana/suggestions/values');
const type = 'value';

export function getSuggestionsProvider({ $http, config, indexPatterns }) {
  const allFields = flatten(indexPatterns.map(indexPattern => indexPattern.fields.raw));
  const shouldSuggestValues = config.get('filterEditor:suggestValues');
  return shouldSuggestValues ? memoize(getValueSuggestions, getFieldQueryHash) : () => [];

  function getValueSuggestions({ start, end, prefix, suffix, fieldName }) {
    const fields = allFields.filter(field => field.name === fieldName);
    const query = `${prefix}${suffix}`;

    const suggestionsByField = fields.map(field => {
      if (field.type === 'boolean') {
        return getSuggestions(start, end, query, ['true', 'false']);
      } else if (!field.aggregatable || field.type !== 'string') {
        return [];
      }

      const queryParams = { query, field: field.name };
      return $http.post(`${baseUrl}/${field.indexPattern.title}`, queryParams)
        .then(({ data }) => {
          const quotedValues = data.map(value => `"${escapeQuotes(value)}"`);
          return getSuggestions(start, end, query, quotedValues);
        });
    });

    return Promise.all(suggestionsByField)
      .then(suggestions => flatten(suggestions));
  }
}

function getSuggestions(start, end, query, values) {
  return uniq(values)
    .filter(value => value.toLowerCase().includes(query.toLowerCase()))
    .map(value => {
      const text = `${value} `;
      return { type, text, start, end };
    });
}

function getFieldQueryHash({ prefix, suffix, fieldName }) {
  return `${prefix}${suffix}/${fieldName}`;
}
