/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PatternMatchFailure, PatternMatchToken, PatternMatchTokenResult } from '../types';
/**
 * `%{field}` segments inside a Dissect pattern mark variable parts of the message.
 * After tokenization, each segment is represented **either** as a literal (fixed string) **or** a field
 * to extract, never a combination of both. This greatly simplifies downstream processing and matches
 * how the Elasticsearch ingest dissect processor reasons about patterns.
 */

const DISSECT_PATTERN_REGEX = /%{([^}]+)}/g;

/**
 * Convert a dissect pattern into an ordered list of tokens where each token is
 * either a literal segment (fixed string) or a field name placeholder.
 */
export function parseDissect(pattern: string): PatternMatchToken[] {
  const tokens: PatternMatchToken[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = DISSECT_PATTERN_REGEX.exec(pattern))) {
    // Add literal text before the %{field}
    if (match.index > cursor) {
      tokens.push({ type: 'literal', value: pattern.slice(cursor, match.index) });
    }

    // Add the field placeholder token
    tokens.push({ type: 'capture', field: match[1].trim() });

    cursor = match.index + match[0].length;
  }

  // Add any trailing literal text after the last %{field}
  if (cursor < pattern.length) {
    tokens.push({ type: 'literal', value: pattern.slice(cursor) });
  }

  return tokens;
}

/**
 * Attempt to find the first location where a dissect pattern fails to match the provided message.
 * Returns `null` when the pattern matches fully.
 *
 * The algorithm walks through the token list, advancing a cursor (`pos`) in the message string by
 * matching literal tokens exactly. Field tokens are ignored (they match any text between literals).
 *
 * On the first literal mismatch, it reports the failure and provides context as well as a reasonable
 * placeholder name. The placeholder is the name of the **next** field token (if any), or the
 * special string "(literal)" when no field token follows.
 */
export function findDissectMatchFailure(
  pattern: string,
  message: string
): PatternMatchFailure | null {
  const tokens = parseDissect(pattern);

  const results: PatternMatchTokenResult[] = [];

  let pos = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'literal') {
      const { value } = token;
      const p = message.indexOf(value, pos);

      // Literal not found ⇒ mismatch
      if (p === -1) {
        return {
          pattern,
          message,
          matched: {
            tokens: results,
            value: message.slice(0, pos),
          },
          unmatched: {
            tokens: tokens.slice(i),
            value: message.slice(pos),
          },
        };
      }

      if (tokens[i - 1] && tokens[i - 1].type === 'capture') {
        results.push({
          ...tokens[i - 1],
          captured: message.slice(pos, p),
        });
      }

      results.push({
        ...token,
        captured: value,
      });

      // Advance cursor past the literal we just matched.
      pos = p + value.length;
    }
    // Field tokens do not constrain the message directly; they inherit whatever is
    // between the surrounding literal tokens.
  }

  // If we reached this point, all literals matched ⇒ the pattern matches.
  return null;
}
