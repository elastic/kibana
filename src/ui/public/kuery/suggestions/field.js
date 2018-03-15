import { escape, flatten } from 'lodash';
import { escapeKql } from './escape_kql';
import { sortPrefixFirst } from '../../utils/sort_prefix_first';

const type = 'field';

function getDescription(fieldName) {
  return `<p>Filter results that contain <span class="suggestionItem__callout">${escape(fieldName)}</span></p>`;
}

export function getSuggestionsProvider({ indexPatterns }) {
  const allFields = flatten(indexPatterns.map(indexPattern => indexPattern.fields.raw));
  return function getFieldSuggestions({ start, end, prefix, suffix }) {
    const search = `${prefix}${suffix}`.toLowerCase();
    const filterableFields = allFields.filter(field => field.filterable);
    const fieldNames = filterableFields.map(field => field.name);
    const matchingFieldNames = fieldNames.filter(name => name.toLowerCase().includes(search));
    const sortedFieldNames = sortPrefixFirst(matchingFieldNames, search);
    const suggestions = sortedFieldNames.map(fieldName => {
      const text = `${escapeKql(fieldName)} `;
      const description = getDescription(fieldName);
      return { type, text, description, start, end };
    });
    return suggestions;
  };
}
