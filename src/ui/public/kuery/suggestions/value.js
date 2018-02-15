import chrome from 'ui/chrome';

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
    if (!field || !field.aggregatable || field.type !== 'string') return [];
    return $http.post(`${baseUrl}/${indexPattern.title}`, {
      query: prefix + suffix,
      field: field.name
    }).then(({ data }) => {
      return data.map(value => {
        const text = value + ' ';
        const description = getDescription({ fieldName, value });
        return { type, text, description, start, end };
      });
    });
  };
}
