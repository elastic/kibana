import chrome from 'ui/chrome';
import { escapeQuotes } from './escape_kql';
import { escape } from 'lodash';

const baseUrl = chrome.addBasePath('/api/kibana/suggestions/values');
const type = 'value';

function getDescription({ fieldName, value }) {
  return `
    <p>Find results where <span class="suggestionItem__callout">${escape(fieldName)}</span>
    is <span class="suggestionItem__callout">${escape(value)}</span></p>
  `;
}

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
          const description = getDescription({ fieldName, value });
          return { type, text, description, start, end };
        });
    }
  }
}
