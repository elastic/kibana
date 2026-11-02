/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Aggregation } from './form_types';
import { createMetricSuggestionsProvider } from './suggestions_provider';

describe('createMetricSuggestionsProvider', () => {
  const stats = [
    { id: 's1', label: 'count', aggregation: Aggregation.COUNT },
    { id: 's2', label: 'errors', aggregation: Aggregation.COUNT },
  ];
  const evaluations = [
    { id: 'e1', label: 'error_rate', expression: 'errors / count' },
    { id: 'e2', label: 'error_pct', expression: 'error_rate * 100' },
  ];

  it('suggests all available stat and evaluation labels', () => {
    const provider = createMetricSuggestionsProvider(stats, evaluations);

    const suggestions = provider({ value: '', selectionStart: 0, selectionEnd: 0 });

    expect(suggestions.map((s) => s.text)).toEqual(['count', 'errors', 'error_rate', 'error_pct']);
  });

  it('excludes the given label to avoid self-reference', () => {
    const provider = createMetricSuggestionsProvider(stats, evaluations, 'error_rate');

    const suggestions = provider({ value: '', selectionStart: 0, selectionEnd: 0 });

    expect(suggestions.map((s) => s.text)).toEqual(['count', 'errors', 'error_pct']);
  });

  it('positions each suggestion at the given selection range', () => {
    const provider = createMetricSuggestionsProvider(stats, []);

    const suggestions = provider({ value: 'count / ', selectionStart: 8, selectionEnd: 8 });

    expect(suggestions.every((s) => s.start === 8 && s.end === 8)).toBe(true);
  });
});

// Token filtering, prefix matching and selection handling are generic behavior, covered in
// create_label_suggestions_provider.test.ts.
