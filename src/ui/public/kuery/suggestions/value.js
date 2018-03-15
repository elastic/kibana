import chrome from 'ui/chrome';
import { escapeQuotes } from './escape_kql';

const baseUrl = chrome.addBasePath('/api/kibana/suggestions/values');
const type = 'value';

export function getSuggestionsProvider({ $http, config, indexPattern }) {
  const shouldSuggestValues = config.get('filterEditor:suggestValues');
  return shouldSuggestValues ? getValueSuggestions : () => Promise.resolve([]);

  function getValueSuggestions({ start, end, prefix, suffix, fieldName }) {
    const field = indexPattern.fields.byName[fieldName];
    const query = `${prefix}${suffix}`;

    if (!field) {
      return [];
    } else if (field.type === 'boolean') {
      return getSuggestions(['true', 'false']);
    } else if (!field.aggregatable || field.type !== 'string') {
      return [];
    }

    const queryParams = { query, field: field.name };
    return $http.post(`${baseUrl}/${indexPattern.title}`, queryParams)
      .then(({ data }) => {
        const quotedValues = data.map(value => `"${escapeQuotes(value)}"`);
        return getSuggestions(quotedValues);
      });

    function getSuggestions(values) {
      return values
        .filter(value => value.toLowerCase().includes(query.toLowerCase()))
        .map(value => {
          const text = `${value} `;
          // Values can get long, and they don't really need a description.
          const description = '';
          return { type, text, description, start, end };
        });
    }
  }
}
