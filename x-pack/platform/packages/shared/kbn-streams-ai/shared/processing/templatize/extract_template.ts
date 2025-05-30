/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatRoot } from './format_root';
import { buildGrokRegexMap } from './get_pattern_regex_map';
import { maskCapturingBrackets } from './mask_capturing_brackets';
import { maskQuotes } from './mask_quotes';
import { FIRST_PASS_PATTERNS, PATTERN_PRECEDENCE, TOKEN_SPLIT_CHARS } from './pattern_precedence';
import { splitOnCaptureChars } from './split_on_capture_chars';
import { ExtractTemplateResult } from './types';

const GROK_REGEX_MAP = buildGrokRegexMap();
const FIRST_PASS_REGEXES = Object.fromEntries(
  FIRST_PASS_PATTERNS.map((pattern) => {
    const original = GROK_REGEX_MAP[pattern];
    const global = new RegExp(original.partial, 'g');
    return [pattern, global];
  })
);

/**
 * Masks things like IP address, URIs, etc, but also delimited content like [...] or "..."
 */
function maskFirstPassPatterns(
  msg: string,
  replaceWith?: (pattern: string, match: string) => string
) {
  const literals: string[] = [];
  let masked = msg;

  // Create the replacement function once
  const replacer =
    replaceWith ||
    ((pattern, match) => {
      literals.push(match);
      return `%{${literals.length - 1}}`;
    });

  // Process patterns in a single loop
  for (const pattern of FIRST_PASS_PATTERNS) {
    const regex = FIRST_PASS_REGEXES[pattern];
    masked = masked.replaceAll(regex, (match) => replacer(pattern, match));
  }

  // doing this with regexes is terrible for performance, so we just use plain ole' looping
  masked = maskQuotes(masked, (match) => replacer('CAPTUREGROUP', match));
  masked = maskCapturingBrackets(masked, (match) => replacer('CAPTUREGROUP', match));

  return { literals, masked };
}

function restoreMaskedPatterns(masked: string, literals: string[]): string {
  let out = masked;
  literals.forEach((val, idx) => {
    out = out.replace(`%{${idx}}`, val);
  });
  return out;
}

/*
  Finds delimiter by checking the occurrence of known delimiters,
  picking the lowest value for each character,
  and then taking the one with the highest floor.
*/
function findDelimiter(msgs: string[]): string {
  const delimiterOptions = [
    { id: '|', pattern: /\|/g },
    { id: ',', pattern: /,/g },
    { id: '\\s', pattern: /\s+/g },
    { id: '\\t', pattern: /\t+/g },
    { id: ';', pattern: /;/g },
    { id: ':', pattern: /:/g },
  ];

  const minOccurrences: Record<string, number> = {};

  delimiterOptions.forEach((delimiter) => {
    minOccurrences[delimiter.id] = Infinity;
  });

  msgs.forEach((msg) => {
    const counts: Record<string, number> = {};
    delimiterOptions.forEach((delimiter) => {
      const matches = msg.match(delimiter.pattern);
      counts[delimiter.id] = matches ? matches.length : 0;
    });

    delimiterOptions.forEach((delimiter) => {
      const countInThisMsg = counts[delimiter.id];
      minOccurrences[delimiter.id] = Math.min(minOccurrences[delimiter.id], countInThisMsg);
    });
  });

  // Find the delimiter with the highest minimum occurrence count
  let bestDelimiter = '\\s'; // Default to whitespace if nothing better found
  let highestMinCount = -1;

  delimiterOptions.forEach((delimiter) => {
    const minCount = minOccurrences[delimiter.id];
    if (minCount > highestMinCount) {
      highestMinCount = minCount;
      bestDelimiter = delimiter.id;
    }
  });

  // If no delimiter was found with non-zero minimum occurrences
  // across all messages, default to whitespace
  return highestMinCount > 0 ? bestDelimiter : '\\s+';
}

function tokenizeColumn(col: string, literals: string[]): string[] {
  if (col === '') {
    return [];
  }

  // handle previous replaced patterns
  const tokens: string[] = literals.length
    ? col
        .split(GROK_REGEX_MAP.CAPTUREGROUP.partial)
        .filter((token) => !!token)
        .flatMap((token) => {
          if (token.match(GROK_REGEX_MAP.CAPTUREGROUP.complete)) {
            // if this is [...], ".." etc unwrap and tokenize
            const value = restoreMaskedPatterns(token, literals);

            return splitOnCaptureChars(value) ?? [token];
          }
          return [token];
        })
    : [col];

  let segments: string[] = tokens;

  // Process each split character one at a time
  for (const char of TOKEN_SPLIT_CHARS) {
    const newSegments: string[] = [];

    for (const segment of segments) {
      // leave patterns like IP addresses etc alone
      const tokenMatch = segment.match(GROK_REGEX_MAP.CAPTUREGROUP.complete);
      if (tokenMatch) {
        newSegments.push(segment);
        continue;
      }

      const parts = segment.split(char);

      for (let i = 0; i < parts.length; i++) {
        if (parts[i] !== '') {
          newSegments.push(parts[i]);
        }

        // Add the delimiter if not the last part
        if (i < parts.length - 1) {
          newSegments.push(char);
        }
      }
    }

    segments = newSegments;
  }

  return segments.filter((token) => token !== '');
}

/**
 * split on whitespace, but not on consective whitespace chars
 */
function createDelimiterRegex(delimiter: string): RegExp {
  if (delimiter === '\\s' || delimiter === '\\s+') {
    // Use lookahead to match only a single whitespace character
    return /(?<=\S) /g;
  }

  return new RegExp(delimiter, 'g');
}

/* -----------------------------------------------------------
 *  MAIN IMPLEMENTATION
 * --------------------------------------------------------- */

export function syncExtractTemplate(messages: string[]): ExtractTemplateResult {
  if (!messages.length) {
    return {
      root: {
        formatted: '',
        columns: [],
        delimiter: '',
      },
      templates: [],
    };
  }

  // mask messages by matching highly specific patterns
  const maskedMessages = messages.map((msg) => maskFirstPassPatterns(msg));

  // find the most likely delimiter
  const delimiter = findDelimiter(maskedMessages.map(({ masked }) => masked));
  const templates = maskedMessages.map(({ literals, masked }, index) => {
    const original = messages[index];

    // split log line on likely delimiter
    const columns = masked.split(createDelimiterRegex(delimiter)).map((column) => {
      // tokenize before restoring masked values
      const tokens = tokenizeColumn(column.trim(), literals);

      const result = {
        value: column,
        tokens: tokens.map((token) => {
          const value = restoreMaskedPatterns(token, literals);

          // find all patterns that (completely) match this token
          const patterns = PATTERN_PRECEDENCE.flatMap((pattern, idx) => {
            if (GROK_REGEX_MAP[pattern]?.complete.test(value)) {
              return [idx];
            }
            return [];
          });

          return {
            value,
            patterns,
          };
        }),
      };

      return result;
    });

    return {
      delimiter,
      original,
      columns,
    };
  });

  const columnLengths = templates.map((template) => template.columns.length);

  // find the lowest amount of columns and use it as the amount of columns
  // to process. rest gets dropped into GREEDYDATA
  const minColumns = Math.min(...columnLengths);
  const maxColumns = Math.max(...columnLengths);

  // capture leading and trailing whitespace so we can use it for
  // displaying variable whitespace (LLMs suck at this)
  const LEADING_WHITESPACE = /^\s+/;
  const TRAILING_WHITESPACE = /\s+$/;

  const roots = new Array(minColumns).fill(undefined).map((_, idx) => {
    const rootTokens: Array<{
      patterns: number[];
      values: string[];
    }> = [];

    let maxLeading = 0;
    let maxTrailing = 0;

    const tokenLists = templates.map((template) => template.columns[idx].tokens);

    templates.forEach((template) => {
      const column = template.columns[idx];
      maxLeading = Math.max(maxLeading, column.value.match(LEADING_WHITESPACE)?.[0].length ?? 0);
      maxTrailing = Math.max(maxTrailing, column.value.match(TRAILING_WHITESPACE)?.[0].length ?? 0);
    });

    // uses longest common prefix & longest common suffix for literal values, and collapses in between
    // could maybe use patterns here instead of values... but not sure.

    let lcpLength = 0;
    let lcpContinue = true;

    // first get longest common prefix
    while (lcpContinue) {
      if (tokenLists.some((tokens) => tokens.length <= lcpLength)) {
        lcpContinue = false;
        continue;
      }

      const tokenValues = tokenLists.map((tokens) => tokens[lcpLength].value);
      const firstValue = tokenValues[0];

      if (tokenValues.every((value) => value === firstValue)) {
        // Compute intersection of patterns across all tokens at this position
        const commonPatterns = tokenLists[0][lcpLength].patterns.filter((pattern) =>
          tokenLists.every((tokens) => tokens[lcpLength].patterns.includes(pattern))
        );

        rootTokens.push({
          patterns:
            commonPatterns.length > 0 ? commonPatterns : [PATTERN_PRECEDENCE.indexOf('DATA')],
          values: tokenValues,
        });

        lcpLength++;
      } else {
        lcpContinue = false;
      }
    }

    // now do longest common suffix, starting at end, but only if there are mismatches in LCP
    let lcsLength = 0;
    let lcsContinue = true;
    const lcsSuffixTokens: Array<{
      patterns: number[];
      values: string[];
    }> = [];

    while (lcsContinue) {
      // Check if all lists have enough tokens for this suffix position
      // and ensure we don't overlap with the prefix
      const suffixPos = lcsLength + 1; // position from the end

      if (
        tokenLists.some((tokens) => tokens.length < lcpLength + suffixPos) ||
        tokenLists.some((tokens) => tokens.length - suffixPos < lcpLength)
      ) {
        lcsContinue = false;
        continue;
      }

      // Get token at this position from the end for all lists
      const tokenValues = tokenLists.map((tokens) => tokens[tokens.length - suffixPos].value);
      const firstValue = tokenValues[0];

      // If all token values match, this is part of the LCS
      if (tokenValues.every((value) => value === firstValue)) {
        // Compute intersection of patterns
        const commonPatterns = tokenLists[0][tokenLists[0].length - suffixPos].patterns.filter(
          (pattern) =>
            tokenLists.every((tokens) =>
              tokens[tokens.length - suffixPos].patterns.includes(pattern)
            )
        );

        lcsSuffixTokens.unshift({
          patterns:
            commonPatterns.length > 0 ? commonPatterns : [PATTERN_PRECEDENCE.indexOf('DATA')],
          values: tokenValues,
        });

        lcsLength++;
      } else {
        lcsContinue = false;
      }
    }

    // normalize middle segments
    const allHaveMiddle = tokenLists.every((tokens) => tokens.length > lcpLength + lcsLength);
    const sameMiddleLength = tokenLists.every(
      (tokens) =>
        tokens.length - lcpLength - lcsLength === tokenLists[0].length - lcpLength - lcsLength
    );

    if (allHaveMiddle) {
      if (sameMiddleLength) {
        // if all middle segments have the same length, process token by token
        const middleLength = tokenLists[0].length - lcpLength - lcsLength;

        for (let i = 0; i < middleLength; i++) {
          const middlePos = lcpLength + i;
          const middleTokens = tokenLists.map((tokens) => tokens[middlePos]);
          const middleValues = middleTokens.map((token) => token.value);

          // Find common patterns across these middle tokens
          const commonPatterns = middleTokens[0]?.patterns.filter((pattern) =>
            middleTokens.every((token) => token.patterns.includes(pattern))
          ) || [PATTERN_PRECEDENCE.indexOf('DATA')];

          rootTokens.push({
            patterns:
              commonPatterns.length > 0 ? commonPatterns : [PATTERN_PRECEDENCE.indexOf('DATA')],
            values: middleValues,
          });
        }
      } else {
        // collapse variable length middle segments into %{DATA}
        rootTokens.push({
          patterns: [PATTERN_PRECEDENCE.indexOf('DATA')],
          values: tokenLists.map((tokens) =>
            tokens
              .slice(lcpLength, tokens.length - lcsLength)
              .map((token) => token.value)
              .join('')
          ),
        });
      }
    }

    rootTokens.push(...lcsSuffixTokens);

    return {
      tokens: rootTokens,
      whitespace: {
        leading: maxLeading,
        trailing: maxTrailing,
      },
    };
  });

  // append %{GREEDYDATA} if some columns in some messages have not been processed
  if (maxColumns > minColumns) {
    roots.push({
      tokens: [
        {
          patterns: [PATTERN_PRECEDENCE.indexOf('GREEDYDATA')],
          values: [],
        },
      ],
      whitespace: {
        leading: 0,
        trailing: 0,
      },
    });
  }

  return {
    root: formatRoot(roots, delimiter),
    templates,
  };
}
