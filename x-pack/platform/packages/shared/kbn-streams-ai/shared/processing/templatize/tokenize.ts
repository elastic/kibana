/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GROK_REGEX_MAP } from './get_pattern_regex_map';

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
  const patternRegex = new RegExp(`${GROK_REGEX_MAP.CAPTUREGROUP.partial.source}`);
  return tokens.flatMap((token) => token.split(patternRegex)).filter(Boolean);
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
