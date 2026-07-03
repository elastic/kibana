/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionSuggestionType, SuggestionsProvider } from './types';

/** Matches the run of label-like characters immediately before the cursor, e.g. the `f` in `errors / f`. */
const CURRENT_TOKEN_PATTERN = /[A-Za-z0-9_]*$/;

/**
 * Builds a suggestions provider from a flat list of candidate labels.
 *
 * Suggestions are filtered by the partial label already typed before the cursor (e.g. typing
 * `f` only suggests `foo`, not `bar`), and replace that partial text when selected. When the
 * user has an active text selection instead of just a cursor, filtering is skipped and picking
 * a suggestion replaces the whole selection.
 */
export const createLabelSuggestionsProvider = (
  labels: string[],
  type: ExpressionSuggestionType
): SuggestionsProvider => {
  return ({ value, selectionStart, selectionEnd }) => {
    const hasSelection = selectionStart !== selectionEnd;
    const token = hasSelection
      ? ''
      : CURRENT_TOKEN_PATTERN.exec(value.slice(0, selectionStart))?.[0] ?? '';
    const start = selectionStart - token.length;

    const matchingLabels = token
      ? labels.filter((label) => label.toLowerCase().startsWith(token.toLowerCase()))
      : labels;

    return matchingLabels.map((label) => ({
      type,
      text: label,
      start,
      end: selectionEnd,
    }));
  };
};
