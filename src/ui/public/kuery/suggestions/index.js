import { fromKqlExpression } from '../ast';
import chrome from 'ui/chrome';

const baseUrl = chrome.addBasePath('/api/kibana/suggestions/values');
const cursor = '@kibana-cursor@';

export function getSuggestionsProvider($http, indexPattern) {
  return async function getSuggestions(query, selection) {
    const { start, end } = selection;
    const cursoredQuery = query.substr(0, start) + cursor + query.substr(end);
    const { suggest, prefix, suffix, field } = fromKqlExpression(cursoredQuery, { parseCursor: true });
    if (suggest === 'fields') {
      return getFieldSuggestions(indexPattern, prefix, suffix);
    } else if (suggest === 'values') {
      return await getValueSuggestions(indexPattern, $http, prefix, suffix, indexPattern.fields.byName[field]);
    }
  };
}

function getFieldSuggestions(indexPattern, prefix, suffix) {
  const filterableFields = indexPattern.fields.filter(field => field.filterable);
  const fieldNames = filterableFields.map(field => field.name);
  return fieldNames.filter(field => field.startsWith(prefix) && field.endsWith(suffix));
}

async function getValueSuggestions(indexPattern, $http, prefix, suffix, field) {
  if (!field || !field.aggregatable || field.type !== 'string') return [];
  const response = await $http.post(`${baseUrl}/${indexPattern.title}`, {
    query: prefix + suffix,
    field: field.name
  });
  return response.data;
}
