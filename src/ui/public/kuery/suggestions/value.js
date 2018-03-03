import chrome from 'ui/chrome';
import { escapeKql } from './escape_kql';

const baseUrl = chrome.addBasePath('/api/kibana/suggestions/values');
const type = 'value';

function getDescription({ fieldName, value }) {
  return `
    <p>Find results where <span class="suggestionItem__callout">${fieldName}</span>
    is <span class="suggestionItem__callout">${value}</span></p>
  `;
}

export function getSuggestionsProvider({ $http, indexPattern }) {
  return function getValueSuggestions({ start, end, prefix, suffix, fieldName }) {
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
      .then(({ data }) => getSuggestions(data));

    function getSuggestions(values) {
      return values
        .filter(value => value.includes(query) && value !== query)
        .map(value => {
          const text = `${escapeKql(value)} `;
          const description = getDescription({ fieldName, value });
          return { type, text, description, start, end };
        });
    }
  };
}
