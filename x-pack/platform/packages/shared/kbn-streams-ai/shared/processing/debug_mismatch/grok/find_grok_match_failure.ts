/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  PatternMatchFailure,
  PatternMatchToken,
  PatternMatchTokenLiteral,
  PatternMatchTokenResult,
} from '../types';
import { GrokPatternMap, getGrokPatternMap } from '../../grok/parse_patterns';

/**
 * Parse a GROK expression into tokens.
 */
export function parseGrokTokens(pattern: string): PatternMatchToken[] {
  const tokens: PatternMatchToken[] = [];
  let i = 0;
  let buffer = '';
  const flush = () => {
    if (buffer.length) {
      tokens.push({ type: 'literal', value: buffer });
      buffer = '';
    }
  };
  while (i < pattern.length) {
    if (pattern[i] === '%' && pattern[i + 1] === '{') {
      flush();
      i += 2; // skip %{
      const start = i;
      while (i < pattern.length && pattern[i] !== '}') i++;
      if (i >= pattern.length) throw new Error('Unterminated %{ … } in pattern');
      const inner = pattern.slice(start, i);
      i++; // past }
      const [syntaxOrField, maybeField] = inner.split(':', 2);
      tokens.push({ type: 'syntax', syntax: syntaxOrField, field: maybeField || undefined });
    } else {
      buffer += pattern[i++];
    }
  }
  flush();
  return tokens;
}

/** Attempt to match one token at `pos`; returns match info or null on failure. */
function matchToken(
  token: PatternMatchToken,
  message: string,
  pos: number,
  dict: GrokPatternMap | undefined,
  lookAhead?: string
): { value: string; length: number } | null {
  const slice = message.slice(pos);

  try {
    switch (token.type) {
      case 'literal': {
        try {
          const re = new RegExp('^' + token.value, 'u');
          const m = slice.match(re);
          return m ? { value: m[0], length: m[0].length } : null;
        } catch {
          return null;
        }
      }
      case 'syntax': {
        const rxSource = dict?.[token.syntax];
        if (!rxSource) return null;

        // If we have a look‑ahead literal, constrain the match to be followed by it.
        const cappedSource = lookAhead ? `(?:${rxSource})(?=${lookAhead})` : rxSource;
        const re = new RegExp('^' + cappedSource);
        const m = slice.match(re);

        return m ? { value: m[0], length: m[0].length } : null;
      }
      case 'capture': {
        const re = /^\S+/u;
        const m = slice.match(re);
        return m ? { value: m[0], length: m[0].length } : null;
      }
    }
  } catch (error) {
    return null;
  }
}

/**
 * Sequentially walk tokens; stop at the first mismatch. Uses look‑ahead to avoid premature alt‑matches.
 */
export function findGrokMatchFailure(
  pattern: string,
  message: string,
  dict?: GrokPatternMap
): PatternMatchFailure | null {
  const tokens = parseGrokTokens(pattern);
  const results: PatternMatchTokenResult[] = [];
  let pos = 0;

  dict = {
    ...dict,
    ...getGrokPatternMap(),
  };

  let matched: string = '';

  for (let idx = 0; idx < tokens.length; idx++) {
    const token = tokens[idx];
    // Peek to find the next literal (if any) to build a look‑ahead.
    const nextLit = tokens.slice(idx + 1).find((t) => t.type === 'literal' && t.value.length) as
      | PatternMatchTokenLiteral
      | undefined;

    const info = matchToken(token, message, pos, dict, nextLit?.value);
    if (info) {
      results.push({ ...token, captured: info.value });
      matched += info.value;
      pos += info.length;
    } else {
      return {
        pattern,
        message,
        matched: {
          tokens: results,
          value: matched,
        },
        unmatched: {
          tokens: tokens.slice(idx),
          value: message.slice(pos),
        },
      };
    }
  }

  if (pos < message.length) {
    return {
      pattern,
      message,
      matched: { tokens: results, value: message },
      unmatched: {
        tokens: [{ type: 'literal', value: '<EOS>' }],
        value: '<EOS>',
      },
    };
  }
  return null; // success
}

// -----------------------------------------------------------------------------
// Example demonstrating MONTHNUM with look‑ahead:
// const dict = { MONTHNUM: "(?:0?[1-9]|1[0-2])", NUMBER: "\\d+", YEAR: "[12]\\d{3}" };
// const pat = "%{MONTHNUM:num}.%{NUMBER}“;
// console.log(findGrokMatchFailure(pat, "11.42", dict)); // null (matches 11)
