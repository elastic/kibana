/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionSuggestion } from './types';

export interface InsertSuggestionResult {
  readonly value: string;
  readonly cursor: number;
}

/**
 * Applies a suggestion to the given value, replacing the suggestion's `start`-`end` range with
 * its `text`, and returning the cursor position to restore afterwards (`cursorIndex` within the
 * inserted text, or right after it by default).
 */
export const insertSuggestion = (
  value: string,
  suggestion: ExpressionSuggestion
): InsertSuggestionResult => {
  const { start, end, text, cursorIndex } = suggestion;
  const newValue = value.slice(0, start) + text + value.slice(end);
  const cursor = start + (cursorIndex ?? text.length);

  return { value: newValue, cursor };
};
