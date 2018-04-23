import 'isomorphic-fetch';
import { flatten, memoize } from 'lodash';
import chrome from '../../chrome';
import { escapeQuotes } from './escape_kuery';

const baseUrl = chrome.addBasePath('/api/kibana/suggestions/values');
const type = 'value';

const requestSuggestions = memoize(async (query, field) => {
  const response = await fetch(`${baseUrl}/${field.indexPattern.title}`, {
    method: 'POST',
    body: JSON.stringify({ query, field: field.name }),
  });
  return response.json();
}, resolver);


export function getSuggestionsProvider({ config, indexPatterns }) {
  const allFields = flatten(indexPatterns.map(indexPattern => indexPattern.fields.raw));
  const shouldSuggestValues = config.get('filterEditor:suggestValues');

  return function getValueSuggestions({ start, end, prefix, suffix, fieldName }) {
    const fields = allFields.filter(field => field.name === fieldName);
    const query = `${prefix}${suffix}`;

    const suggestionsByField = fields.map(field => {
      if (field.type === 'boolean') {
        return wrapAsSuggestions(start, end, query, ['true', 'false']);
      } else if (!shouldSuggestValues || !field.aggregatable || field.type !== 'string') {
        return [];
      }

      return requestSuggestions(query, field).then(data => {
        const quotedValues = data.map(value => `"${escapeQuotes(value)}"`);
        return wrapAsSuggestions(start, end, query, quotedValues);
      });
    });

    return Promise.all(suggestionsByField)
      .then(suggestions => flatten(suggestions));
  };
}

function wrapAsSuggestions(start, end, query, values) {
  return values
    .filter(value => value.toLowerCase().includes(query.toLowerCase()))
    .map(value => {
      const text = `${value} `;
      return { type, text, start, end };
    });
}

function resolver(query, field) {
  // Only cache results for a minute
  const ttl = Math.floor(Date.now() / 1000 / 60);
  return [ttl, query, field.indexPattern.title, field.name].join('|');
}
