import { escapeKql } from './escape_kql';

const type = 'field';

function getDescription(fieldName) {
  return `<p>Filter results that contain <span class="suggestionItem__callout">${fieldName}</span></p>`;
}

export function getSuggestionsProvider({ indexPattern }) {
  return function getFieldSuggestions({ start, end, prefix, suffix }) {
    const search = `${prefix}${suffix}`.toLowerCase();
    const filterableFields = indexPattern.fields.filter(field => field.filterable);
    const fieldNames = filterableFields.map(field => field.name);
    const matchingFieldNames = fieldNames.filter(field => field.toLowerCase().includes(search));
    const suggestions = matchingFieldNames.map(fieldName => {
      const text = `${escapeKql(fieldName)} `;
      const description = getDescription(fieldName);
      return { type, text, description, start, end };
    });
    return Promise.resolve(suggestions);
  };
}
