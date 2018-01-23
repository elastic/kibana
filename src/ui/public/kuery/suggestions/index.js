import { fromKqlExpression } from '../ast';
import chrome from 'ui/chrome';

const baseUrl = chrome.addBasePath('/api/kibana/suggestions/values');
const cursor = '@kibana-cursor@';

export function getSuggestionsProvider($http, indexPattern, persistedLog) {
  return async function getSuggestions(query, selectionStart, selectionEnd) {
    const cursoredQuery = query.substr(0, selectionStart) + cursor + query.substr(selectionEnd);
    const { suggest, prefix, suffix, start, end, field } = fromKqlExpression(cursoredQuery, { parseCursor: true });
    if (!suggest) return [];
    let suggestions = [];
    if (suggest.includes('fields')) {
      const fields = getFieldSuggestions(indexPattern, prefix, suffix, start, end);
      suggestions = [...suggestions, ...fields];
    }
    if (suggest.includes('values')) {
      const values = await getValueSuggestions(indexPattern, $http, prefix, suffix, start, end, indexPattern.fields.byName[field]);
      suggestions = [...suggestions, ...values];
    }
    if (suggest.includes('operators')) {
      const operators = getOperatorSuggestions(indexPattern, start, end, indexPattern.fields.byName[field]);
      suggestions = [...suggestions, ...operators];
    }
    if (suggest.includes('conjunctions')) {
      const conjunctions = getConjunctionSuggestions(prefix, suffix, start);
      suggestions = [...suggestions, ...conjunctions];
    }
    const recentSearches = getRecentSearchSuggestions(persistedLog.get(), query);
    return [...suggestions, ...recentSearches];
  };
}

function getFieldSuggestions(indexPattern, prefix, suffix, start, end) {
  const filterableFields = indexPattern.fields.filter(field => field.filterable);
  const fieldNames = filterableFields.map(field => field.name);
  const suggestions = fieldNames.filter(field => field.startsWith(prefix) && field.endsWith(suffix));
  return suggestions.map(suggestion => ({ start, end, suggestion }));
}

async function getValueSuggestions(indexPattern, $http, prefix, suffix, start, end, field) {
  if (!field || !field.aggregatable || field.type !== 'string') return [];
  const { data } = await $http.post(`${baseUrl}/${indexPattern.title}`, {
    query: prefix + suffix,
    field: field.name
  });
  return data.map(suggestion => ({ start, end, suggestion }));
}

function getOperatorSuggestions(indexPattern, start, end, field) {
  if (!field) return [];
  let operators = [];
  if (['number', 'date', 'ip'].includes(field.type)) {
    operators = [...operators, '<', '>', '<=', '>='];
  }
  if (['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'].includes(field.type)) {
    operators = [...operators, ':'];
  }
  operators = [...operators, ':*'];
  return operators.map(suggestion => ({ start: end, end, suggestion }));
}

function getConjunctionSuggestions(prefix, suffix, start) {
  if (!prefix.endsWith(' ')) return [];
  return ['and ', 'or '].map(suggestion => ({
    start: start + prefix.length,
    end: start + prefix.length,
    suggestion
  }));
}

function getRecentSearchSuggestions(recentSearches, query) {
  const matches = recentSearches.filter(search => search.includes(query));
  return matches.map(suggestion => ({ start: 0, end: query.length, suggestion }));
}
