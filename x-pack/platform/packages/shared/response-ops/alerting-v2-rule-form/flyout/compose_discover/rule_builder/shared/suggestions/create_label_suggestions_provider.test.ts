/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createLabelSuggestionsProvider } from './create_label_suggestions_provider';

describe('createLabelSuggestionsProvider', () => {
  it('positions each suggestion at the given selection range', () => {
    const provider = createLabelSuggestionsProvider(['count', 'errors'], 'metric');

    const suggestions = provider({ value: 'count / ', selectionStart: 8, selectionEnd: 8 });

    expect(suggestions.every((s) => s.start === 8 && s.end === 8)).toBe(true);
  });

  it('filters suggestions by the partial label typed before the cursor', () => {
    const provider = createLabelSuggestionsProvider(['foo', 'bar'], 'metric');

    const suggestions = provider({ value: 'f', selectionStart: 1, selectionEnd: 1 });

    expect(suggestions).toEqual([{ type: 'metric', text: 'foo', start: 0, end: 1 }]);
  });

  it('matches the typed prefix case-insensitively', () => {
    const provider = createLabelSuggestionsProvider(['foo'], 'metric');

    const suggestions = provider({ value: 'F', selectionStart: 1, selectionEnd: 1 });

    expect(suggestions.map((s) => s.text)).toEqual(['foo']);
  });

  it('shows every suggestion again once the token boundary is left behind', () => {
    const provider = createLabelSuggestionsProvider(['count', 'errors'], 'metric');

    const suggestions = provider({ value: 'count / ', selectionStart: 8, selectionEnd: 8 });

    expect(suggestions.map((s) => s.text)).toEqual(['count', 'errors']);
  });

  it('ignores prefix filtering and replaces the whole selection when text is selected', () => {
    const provider = createLabelSuggestionsProvider(['count', 'errors'], 'metric');

    const suggestions = provider({ value: 'count / foo', selectionStart: 8, selectionEnd: 11 });

    expect(suggestions).toEqual([
      { type: 'metric', text: 'count', start: 8, end: 11 },
      { type: 'metric', text: 'errors', start: 8, end: 11 },
    ]);
  });
});
