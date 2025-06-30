/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition, pull } from 'lodash';
import { formatRoot } from './format_root';
import { maskCapturingBrackets } from './mask_capturing_brackets';
import { maskQuotes } from './mask_quotes';
import { FIRST_PASS_PATTERNS, PATTERN_PRECEDENCE, TOKEN_SPLIT_CHARS } from './pattern_precedence';
import { ALL_CAPTURE_CHARS } from './split_on_capture_chars';
import { normalizeTokensForColumn } from './normalize_tokens';
import { ExtractTemplateResult } from './types';
import { findMatchingPatterns } from './find_matching_patterns';
import { GROK_REGEX_MAP } from './get_pattern_regex_map';
import { tokenize } from './tokenize';

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
      return `%{${pattern}:${literals.length - 1}}`;
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
    out = out.replace(new RegExp(`%\\{[A-Za_z0-9_]+\\:${idx}\\}`), val);
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

function tokenizeLines(
  {
    delimiter,
    messages,
    maskedMessages,
  }: {
    delimiter: string;
    messages: string[];
    maskedMessages: Array<{ masked: string; literals: string[] }>;
  },
  splitChars?: string[][]
) {
  return maskedMessages.map(({ literals, masked }, index) => {
    const original = messages[index];

    // split log line on likely delimiter
    const columns = masked.split(createDelimiterRegex(delimiter)).map((column, idx) => {
      // tokenize before restoring masked values
      const tokens = tokenize(column.trim(), literals, splitChars?.[idx] ?? TOKEN_SPLIT_CHARS);

      const result = {
        value: column,
        tokens: tokens.map((token) => {
          const value = restoreMaskedPatterns(token, literals);

          // find all patterns that (completely) match this token
          const patterns = findMatchingPatterns(value);

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
}

function findConsistentSplitChars(
  messages: Array<{
    delimiter: string;
    original: string;
    columns: Array<{
      value: string;
      tokens: Array<{
        value: string;
        patterns: number[];
      }>;
    }>;
  }>
): string[][] {
  const splitTokenCountPerColumn: Array<Record<string, number>> = [];

  const consistentTokensPerColumn: string[][] = [];

  const [splitCharsToCheck, quoteSplitChars] = partition(
    TOKEN_SPLIT_CHARS,
    (token) => !ALL_CAPTURE_CHARS.includes(token)
  );

  messages.forEach((message) => {
    message.columns.forEach((column, idx) => {
      const counter: Record<string, number> = Object.fromEntries(
        splitCharsToCheck.map((token) => [token, 0])
      );

      column.tokens.forEach((token) => {
        if (splitCharsToCheck.includes(token.value)) {
          counter[token.value]++;
        }
      });

      if (!splitTokenCountPerColumn[idx]) {
        consistentTokensPerColumn[idx] = splitCharsToCheck.concat();
        splitTokenCountPerColumn[idx] = counter;
        return;
      }

      consistentTokensPerColumn[idx].forEach((splitToken) => {
        const countForThisRow = counter[splitToken];
        const previousCount = splitTokenCountPerColumn[idx][splitToken];

        if (countForThisRow !== previousCount) {
          pull(consistentTokensPerColumn[idx], splitToken);
        }
      });
    });
  });

  return consistentTokensPerColumn.map((tokens, idx) => {
    return splitCharsToCheck
      .filter((token) => {
        return tokens.includes(token);
      })
      .concat(quoteSplitChars);
  });
}

/* -----------------------------------------------------------
 *  MAIN IMPLEMENTATION
 * --------------------------------------------------------- */

export function syncExtractTemplate(messages: string[]): ExtractTemplateResult {
  if (!messages.length) {
    return {
      root: {
        values: {},
        formatted: {
          display: '',
          grok: '',
        },
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

  const firstPassTemplates = tokenizeLines({
    delimiter,
    maskedMessages,
    messages,
  });

  const nextPassSplitChars = findConsistentSplitChars(firstPassTemplates);

  const templates = tokenizeLines(
    {
      delimiter,
      maskedMessages,
      messages,
    },
    nextPassSplitChars
  );

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
    const tokenLists = templates.map((template) => template.columns[idx].tokens);

    // Calculate whitespace stats
    let maxLeading = 0;
    let maxTrailing = 0;
    templates.forEach((template) => {
      const column = template.columns[idx];
      maxLeading = Math.max(maxLeading, column.value.match(LEADING_WHITESPACE)?.[0].length ?? 0);
      maxTrailing = Math.max(maxTrailing, column.value.match(TRAILING_WHITESPACE)?.[0].length ?? 0);
    });

    // Use the normalize_tokens module to handle the token normalization
    return normalizeTokensForColumn(tokenLists, maxLeading, maxTrailing);
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
