/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  builtinConstants,
  builtinFunctions,
  dataTypes,
  getEditorAutoCompleteSuggestion,
  keywords,
  osqueryTableNames,
} from './osquery_highlight_rules';
import { flatMap, uniq } from 'lodash';

describe('Osquery Editor', () => {
  const regex = /\s*[\s,]\s*/;

  test('should split properly by regex', () => {
    const value = 'Select description, user_account from services; /n Where des';
    const split = value.split(regex);
    const result = [
      'Select',
      'description',
      'user_account',
      'from',
      'services;',
      '/n',
      'Where',
      'des',
    ];

    expect(split).toEqual(result);
  });
  test('should provide proper suggestions', () => {
    const value = 'Select description, user_account from services; /n Where des';

    const range = { startLineNumber: 2, endLineNumber: 2, startColumn: 2, endColumn: 2 };

    // @ts-expect-error TS2339: Property 'suggestions' does not exist on type 'ProviderResult '.
    const { suggestions } = getEditorAutoCompleteSuggestion(range, value, false);

    const flatSuggestionLabels = flatMap(suggestions, (obj) => obj.label);
    expect(flatSuggestionLabels).toEqual(suggestionLabels);
  });
  test('should provide just keywords if column is 1', () => {
    const value = 'Select description, user_account from services; /n Where des';

    const range = { startLineNumber: 1, endLineNumber: 1, startColumn: 1, endColumn: 1 };

    // @ts-expect-error TS2339: Property 'suggestions' does not exist on type 'ProviderResult '.
    const { suggestions } = getEditorAutoCompleteSuggestion(range, value, false);

    const flatSuggestionLabels = flatMap(suggestions, (obj) => obj.label);
    expect(flatSuggestionLabels).toEqual(keywordsSuggestionLabels);
  });
});

const keywordsSuggestionLabels = keywords.map((kw) => kw.toUpperCase());

const suggestionLabels = uniq([
  ...keywordsSuggestionLabels,
  ...osqueryTableNames,
  ...builtinConstants,
  ...builtinFunctions,
  ...dataTypes,
  'description',
  'user_account',
  'services;',
  '/n',
]);
