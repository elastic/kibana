/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { getAutocompleteProvider } from 'ui/autocomplete_providers';
import { StaticIndexPattern } from 'ui/index_patterns';

export function convertKueryToEsQuery(kuery: string, indexPattern: StaticIndexPattern) {
  const ast = fromKueryExpression(kuery);
  return toElasticsearchQuery(ast, indexPattern);
}

export async function getKuerySuggestions(
  query: string,
  selectionStart: number,
  indexPattern: StaticIndexPattern,
  boolFilter: unknown
) {
  const autocompleteProvider = getAutocompleteProvider('kuery');

  if (!autocompleteProvider) {
    return [];
  }

  const getAutocompleteSuggestions = autocompleteProvider({
    config: { get: () => null }, // unused-yet-required config.get function
    indexPatterns: [indexPattern],
    boolFilter,
  });

  return getAutocompleteSuggestions({
    query,
    selectionStart,
    selectionEnd: selectionStart,
  });
}
