/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { npStart } from 'ui/new_platform';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

const getAutocompleteProvider = language => npStart.plugins.data.autocomplete.getProvider(language);

export async function getSuggestions(query, selectionStart, indexPattern, boolFilter) {
  const autocompleteProvider = getAutocompleteProvider('kuery');
  if (!autocompleteProvider) {
    return [];
  }
  const config = {
    get: () => true,
  };

  const getAutocompleteSuggestions = autocompleteProvider({
    config,
    indexPatterns: [indexPattern],
    boolFilter,
  });
  return getAutocompleteSuggestions({
    query,
    selectionStart,
    selectionEnd: selectionStart,
  });
}

function convertKueryToEsQuery(kuery, indexPattern) {
  const ast = fromKueryExpression(kuery);
  return toElasticsearchQuery(ast, indexPattern);
}
// Recommended by MDN for escaping user input to be treated as a literal string within a regular expression
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function escapeParens(string) {
  return string.replace(/[()]/g, '\\$&');
}

export function escapeDoubleQuotes(string) {
  return string.replace(/\"/g, '\\$&');
}

export function getKqlQueryValues(inputValue, indexPattern) {
  const ast = fromKueryExpression(inputValue);
  const isAndOperator = ast.function === 'and';
  const query = convertKueryToEsQuery(inputValue, indexPattern);
  const filteredFields = [];

  if (!query) {
    return;
  }

  // if ast.type == 'function' then layout of ast.arguments:
  // [{ arguments: [ { type: 'literal', value: 'AAL' } ] },{ arguments: [ { type: 'literal', value: 'AAL' } ] }]
  if (ast && Array.isArray(ast.arguments)) {
    ast.arguments.forEach(arg => {
      if (arg.arguments !== undefined) {
        arg.arguments.forEach(nestedArg => {
          if (typeof nestedArg.value === 'string') {
            filteredFields.push(nestedArg.value);
          }
        });
      } else if (typeof arg.value === 'string') {
        filteredFields.push(arg.value);
      }
    });
  }

  return {
    filterQuery: query,
    filteredFields,
    queryString: inputValue,
    isAndOperator,
    tableQueryString: inputValue,
  };
}

export function getQueryPattern(fieldName, fieldValue) {
  const sanitizedFieldName = escapeRegExp(fieldName);
  const sanitizedFieldValue = escapeRegExp(fieldValue);

  return new RegExp(`(${sanitizedFieldName})\\s?:\\s?(")?(${sanitizedFieldValue})(")?`, 'i');
}

export function removeFilterFromQueryString(currentQueryString, fieldName, fieldValue) {
  let newQueryString = '';
  // Remove the passed in fieldName and value from the existing filter
  const queryPattern = getQueryPattern(fieldName, fieldValue);
  newQueryString = currentQueryString.replace(queryPattern, '');
  // match 'and' or 'or' at the start/end of the string
  const endPattern = /\s(and|or)\s*$/gi;
  const startPattern = /^\s*(and|or)\s/gi;
  // If string has a double operator (e.g. tag:thing or or tag:other) remove and replace with the first occurring operator
  const invalidOperatorPattern = /\s+(and|or)\s+(and|or)\s+/gi;
  newQueryString = newQueryString.replace(invalidOperatorPattern, ' $1 ');
  // If string starts/ends with 'and' or 'or' remove that as that is illegal kuery syntax
  newQueryString = newQueryString.replace(endPattern, '');
  newQueryString = newQueryString.replace(startPattern, '');

  return newQueryString;
}
