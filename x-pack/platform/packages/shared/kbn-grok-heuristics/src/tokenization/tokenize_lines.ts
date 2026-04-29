/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GROK_REGEX_MAP, PATTERN_PRECEDENCE, TOKEN_SPLIT_CHARS } from '../constants';
import { restoreMaskedPatterns } from './mask_first_pass_patterns';
import type { MaskedMessage } from '../types';

/**
 * Split messages into columns (using the specified delimiter), tokenize them (using the specified
 * split characters), and identify matching patterns for each token.
 */
export function tokenizeLines(lines: MaskedMessage[], delimiter: string, splitChars?: string[][]) {
  const delimiterRegex = createDelimiterRegex(delimiter);
  const delimiterValue =
    delimiter === '\\s' ? ' ' : delimiter === '\\t' ? '\t' : delimiter === '\\|' ? '|' : delimiter;

  return lines.map(({ literals, masked }) => {
    // split log line on likely delimiter
    const result = masked.split(delimiterRegex).map((column, index) => {
      // tokenize before restoring masked values
      const tokens = tokenize(
        column.trim(),
        literals,
        splitChars ? splitChars[index] : TOKEN_SPLIT_CHARS
      );
      return {
        column,
        tokens,
        values: tokens.map((token) => restoreMaskedPatterns(token, literals)),
      };
    });

    return result.map(({ column, values, tokens }, i) => {
      return {
        value: column,
        tokens: tokens.map((token, k) => {
          const value: string = values[k];
          const nextValue: string | undefined = values[k + 1];
          const isLastTokenInColumn = k === tokens.length - 1;
          const isLastTokenAcrossAllColumns = isLastTokenInColumn && i === result.length - 1;

          // find all patterns that (completely) match this token (without bleeding into the next token or column)
          const { patterns, excludedPatterns } = findMatchingPatterns(
            value,
            isLastTokenAcrossAllColumns
              ? undefined
              : isLastTokenInColumn
              ? delimiterValue
              : nextValue
          );
          return {
            value,
            patterns,
            excludedPatterns,
          };
        }),
      };
    });
  });
}

interface TokenProcessingResult {
  tokens: string[];
  shouldContinue: boolean;
}

function processCaptureGroups(token: string, literals: string[]): TokenProcessingResult {
  const captureGroupRegex = /(%\{CAPTUREGROUP:\d+\})/g;
  const captureGroupReplaceRegex = /%\{CAPTUREGROUP:(\d+)\}/g;

  if (!captureGroupRegex.test(token)) {
    return { tokens: [token], shouldContinue: false };
  }

  const parts = token
    .split(captureGroupRegex)
    .map((part) => {
      const next = part.replace(captureGroupReplaceRegex, (_, idx) => literals[Number(idx)]);

      return next;
    })
    .filter(Boolean);

  return { tokens: parts, shouldContinue: true };
}

function splitByPattern(tokens: string[]): string[] {
  return tokens
    .flatMap((token) => token.split(GROK_REGEX_MAP.CAPTUREGROUP.partial))
    .filter(Boolean);
}

// Helper function to escape special characters for use in a RegExp
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function tokenize(col: string, literals: string[], splitChars: string[]): string[] {
  if (!col || col.trim() === '') {
    return [];
  }

  let tokens: string[] = [col];

  // 1. Process capture groups iteratively until no more expansions occur
  //    processCaptureGroups splits a token if it contains a %{CAPTUREGROUP:N} pattern,
  //    replacing it with the corresponding literal. This loop ensures that if a
  //    literal itself contains another capture group pattern, it's also processed.
  let changedInPass = true;
  while (changedInPass) {
    changedInPass = false;
    tokens = tokens.flatMap((currentToken) => {
      const { tokens: newTokens, shouldContinue } = processCaptureGroups(currentToken, literals);
      if (shouldContinue) {
        // 'shouldContinue' is true if processCaptureGroups modified the token
        changedInPass = true;
      }
      return newTokens;
    });
  }

  // 2. Split by Grok pattern syntax
  //    splitByPattern breaks tokens further based on the structure of Grok patterns
  //    (e.g., separating raw text from %{PATTERN_NAME} syntax).
  tokens = splitByPattern(tokens);

  // 3. Process delimiters
  //    This step splits tokens by each defined delimiter (TOKEN_SPLIT_CHARS),
  //    keeping the delimiters themselves as separate tokens. Complete Grok patterns
  //    (e.g., %{IP}) are not split by delimiters.
  for (const delimiter of splitChars) {
    const escapedDelimiter = escapeRegex(delimiter);
    // Regex to split by the delimiter while capturing (keeping) the delimiter
    const delimiterRegex = new RegExp(`(${escapedDelimiter})`);

    tokens = tokens.flatMap((segment) => {
      // Do not split segments that are already identified as complete Grok patterns
      if (GROK_REGEX_MAP.CAPTUREGROUP.complete.test(segment)) {
        return [segment];
      }

      // Split the segment by the delimiter, keeping the delimiter, and removing empty strings
      return segment.split(delimiterRegex).filter(Boolean);
    });
  }

  // Final filter to remove any empty strings that might have been introduced.
  return tokens.filter(Boolean);
}

/**
 * split on whitespace, but not on consective whitespace chars
 */
function createDelimiterRegex(delimiter: string): RegExp {
  if (delimiter === '\\s') {
    // Use lookahead to match only a single whitespace character
    return /(?<=\S) /g;
  }

  return new RegExp(delimiter, 'g');
}
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
