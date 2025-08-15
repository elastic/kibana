/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GROK_REGEX_MAP, PATTERN_PRECEDENCE } from './constants';

const DATA_PATTERN_INDEX = PATTERN_PRECEDENCE.indexOf('DATA');

interface FindMatchingPatternsResult {
  // Patterns that match the complete value ordered by precedence.
  patterns: number[];
  // Patterns that match the complete value but also match the first character of the next token so should be excluded.
  excludedPatterns: number[];
}

export function findMatchingPatterns(
  value: string,
  nextValue?: string
): FindMatchingPatternsResult {
  const patterns: number[] = [];
  const excludedPatterns: number[] = [];
  PATTERN_PRECEDENCE.forEach((pattern, idx) => {
    const grok = GROK_REGEX_MAP[pattern];
    if (grok.complete.test(value)) {
      // Ensure that the pattern does not also match the first character of the next token (or the column delimiter).
      // We don't carry out this check for DATA pattern since that matches lazy (as few characters as possible until the next pattern) so can be safely used as a fallback.
      if (
        idx !== DATA_PATTERN_INDEX &&
        nextValue &&
        grok.complete.test(`${value}${nextValue.charAt(0)}`)
      ) {
        excludedPatterns.push(idx);
      } else {
        patterns.push(idx);
      }
    }
  });
  return { patterns, excludedPatterns };
}
