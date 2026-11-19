/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExpressionSuggestionType, SuggestionsProvider } from './types';
import { escapeField } from '../escape_esql_identifier';

/**
 * Characters that terminate a bare (non-backtick-quoted) identifier in an ES|QL expression.
 * Spaces are deliberately excluded so that typing a partial multi-word label (e.g. "error c")
 * still narrows suggestions to "error count", matching how the label would eventually be
 * inserted (backtick-quoted, spaces and all).
 */
const TOKEN_BOUNDARY_PATTERN = /[/+\-*()=,<>!%]/;

interface CurrentToken {
  readonly token: string;
  readonly start: number;
  /** Whether the cursor sits right after an unclosed opening backtick. */
  readonly insideBacktick: boolean;
}

const getCurrentToken = (value: string, selectionStart: number): CurrentToken => {
  const beforeCursor = value.slice(0, selectionStart);
  const backtickCount = beforeCursor.split('`').length - 1;
  const insideBacktick = backtickCount % 2 === 1;

  if (insideBacktick) {
    const openBacktickIndex = beforeCursor.lastIndexOf('`');
    return {
      token: beforeCursor.slice(openBacktickIndex + 1),
      start: openBacktickIndex + 1,
      insideBacktick,
    };
  }

  let start = selectionStart;
  while (start > 0 && !TOKEN_BOUNDARY_PATTERN.test(value[start - 1])) {
    start--;
  }
  const raw = value.slice(start, selectionStart);
  const leadingWhitespace = raw.match(/^\s+/)?.[0].length ?? 0;
  return { token: raw.slice(leadingWhitespace), start: start + leadingWhitespace, insideBacktick };
};

/**
 * Builds a suggestions provider from a flat list of candidate labels.
 *
 * Suggestions are filtered by the partial label already typed before the cursor (e.g. typing
 * `error c` suggests `error count`), and replace that partial text when selected. When the user
 * has an active text selection instead of just a cursor, filtering is skipped and picking a
 * suggestion replaces the whole selection.
 *
 * Labels that aren't valid bare ES|QL identifiers (e.g. containing spaces) are backtick-quoted
 * on insertion — unless the cursor is already inside a backtick the user opened themselves, in
 * which case the raw label is inserted and the closing backtick is completed for them.
 */
export const createLabelSuggestionsProvider = (
  labels: string[],
  type: ExpressionSuggestionType
): SuggestionsProvider => {
  return ({ value, selectionStart, selectionEnd }) => {
    const hasSelection = selectionStart !== selectionEnd;
    const { token, start, insideBacktick } = hasSelection
      ? { token: '', start: selectionStart, insideBacktick: false }
      : getCurrentToken(value, selectionStart);

    const matchingLabels = token
      ? labels.filter((label) => label.toLowerCase().startsWith(token.toLowerCase()))
      : labels;

    return matchingLabels.map((label) => ({
      type,
      text: insideBacktick ? `${label}\`` : escapeField(label),
      start,
      end: selectionEnd,
    }));
  };
};
