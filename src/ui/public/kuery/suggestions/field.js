import { escape } from 'lodash';
import { escapeKuery } from './escape_kuery';
import { sortPrefixFirst } from '../../utils/sort_prefix_first';

const type = 'field';

function getDescription(fieldName) {
  return `<p>Filter results that contain <span class="suggestionItem__callout">${escape(fieldName)}</span></p>`;
}

export function getSuggestionsProvider({ fields }) {
  return function getFieldSuggestions({ start, end, prefix, suffix }) {
    const search = `${prefix}${suffix}`.toLowerCase();
    const filterableFields = fields.filter(field => field.filterable);
    const fieldNames = filterableFields.map(field => field.name);
    const matchingFieldNames = fieldNames.filter(name => name.toLowerCase().includes(search));
    const sortedFieldNames = sortPrefixFirst(matchingFieldNames.sort(keywordComparator), search);
    const suggestions = sortedFieldNames.map(fieldName => {
      const text = `${escapeKuery(fieldName)} `;
      const description = getDescription(fieldName);
      return { type, text, description, start, end };
    });
    return suggestions;
  };
}

function keywordComparator(first, second) {
  const extensions = ['raw', 'keyword'];
  if (extensions.map(ext => `${first}.${ext}`).includes(second)) {
    return 1;
  } else if (extensions.map(ext => `${second}.${ext}`).includes(first)) {
    return -1;
  }
  return first.localeCompare(second);
}
