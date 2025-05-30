/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PatternMatchFailure, PatternMatchToken } from './types';

function tokenToString(token: PatternMatchToken, wrapLiterals: boolean): string {
  switch (token.type) {
    case 'literal':
      return wrapLiterals ? `"${token.value}"` : token.value;
    case 'capture':
      return `%{${token.field}}`;
    case 'syntax':
      return token.field ? `%{${token.syntax}:${token.field}}` : `%{${token.syntax}}`;
  }
}

export interface FormattedMatchFailure {
  message: string;
  pattern: string;
  remaining: string;
  matched: Record<string, string>;
  expected: string[];
}

export function formatMatchFailure({
  matched,
  unmatched,
  pattern,
}: PatternMatchFailure): FormattedMatchFailure {
  // Determine the remaining string: prefer `after` if provided, otherwise slice from the end of last match
  const remaining: string = unmatched.value;

  return {
    message: `Could only partially match pattern`,
    pattern,
    remaining,
    matched: Object.fromEntries(
      matched.tokens.map((token) => [tokenToString(token, false), token.captured])
    ),
    expected: unmatched.tokens.slice(0, 1).map((token) => tokenToString(token, false)),
  };
}
