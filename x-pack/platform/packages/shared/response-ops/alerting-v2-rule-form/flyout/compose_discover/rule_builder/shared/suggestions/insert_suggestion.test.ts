/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { insertSuggestion } from './insert_suggestion';
import type { ExpressionSuggestion } from './types';

const suggestion = (overrides: Partial<ExpressionSuggestion> = {}): ExpressionSuggestion => ({
  type: 'metric',
  text: 'errors',
  start: 0,
  end: 0,
  ...overrides,
});

describe('insertSuggestion', () => {
  it('inserts the text at the cursor position when there is no selection', () => {
    const result = insertSuggestion('count / ', suggestion({ text: 'errors', start: 8, end: 8 }));

    expect(result).toEqual({ value: 'count / errors', cursor: 14 });
  });

  it('inserts in the middle of the existing value', () => {
    const result = insertSuggestion('() * 100', suggestion({ text: 'errors', start: 1, end: 1 }));

    expect(result).toEqual({ value: '(errors) * 100', cursor: 7 });
  });

  it('replaces a selected range instead of just inserting', () => {
    const result = insertSuggestion(
      'count / foo',
      suggestion({ text: 'errors', start: 8, end: 11 })
    );

    expect(result).toEqual({ value: 'count / errors', cursor: 14 });
  });

  it('respects a custom cursorIndex within the inserted text', () => {
    const result = insertSuggestion(
      '',
      suggestion({ text: 'sum()', start: 0, end: 0, cursorIndex: 4 })
    );

    expect(result).toEqual({ value: 'sum()', cursor: 4 });
  });
});
