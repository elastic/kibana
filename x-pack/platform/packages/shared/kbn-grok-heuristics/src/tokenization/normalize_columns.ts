/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PATTERN_PRECEDENCE } from '../constants';
import { normalizeTokens } from './normalize_tokens';
import type { SingleLineToken, SingleLineColumn, NormalizedColumn } from '../types';

/**
 * Normalizes columns for each line into one single set of columns that represents a common structure.
 *
 * @param columnsPerLine - Array of message templates, each containing columns with tokens.
 * @returns Normalized columns with whitespace stats and token patterns.
 */
export function normalizeColumns(columnsPerLine: SingleLineColumn[][]): NormalizedColumn[] {
  const columnLengths = columnsPerLine.map((template) => template.length);

  // find the lowest amount of columns and use it as the amount of columns
  // to process. rest gets dropped into GREEDYDATA
  const minColumns = Math.min(...columnLengths);
  const maxColumns = Math.max(...columnLengths);

  // capture leading and trailing whitespace so we can use it for
  // displaying variable whitespace (LLMs suck at this)
  const LEADING_WHITESPACE = /^\s+/;
  const TRAILING_WHITESPACE = /\s+$/;

  // Combine columns/tokens per message into single template
  const normalizedColumns: NormalizedColumn[] = [];
  for (let index = 0; index < minColumns; index++) {
    let minLeading = Infinity;
    let maxLeading = 0;
    let minTrailing = Infinity;
    let maxTrailing = 0;

    const tokensPerLine: SingleLineToken[][] = [];

    // Single iteration to calculate tokensPerLine and whitespace stats
    for (const columns of columnsPerLine) {
      const column = columns[index];
      tokensPerLine.push(column.tokens);

      const leadingWhitespace = column.value.match(LEADING_WHITESPACE)?.[0].length ?? 0;
      const trailingWhitespace = column.value.match(TRAILING_WHITESPACE)?.[0].length ?? 0;

      minLeading = Math.min(minLeading, leadingWhitespace);
      maxLeading = Math.max(maxLeading, leadingWhitespace);
      minTrailing = Math.min(minTrailing, trailingWhitespace);
      maxTrailing = Math.max(maxTrailing, trailingWhitespace);
    }

    // Only include the minimum amount of variable whitespace that is consistent across all messages
    normalizedColumns.push({
      tokens: normalizeTokens(tokensPerLine),
      whitespace: {
        minLeading: minLeading === Infinity ? 0 : minLeading,
        maxLeading,
        minTrailing: minTrailing === Infinity ? 0 : minTrailing,
        maxTrailing,
      },
    });
  }

  // append %{GREEDYDATA} if some columns in some messages have not been processed
  if (maxColumns > minColumns) {
    normalizedColumns.push({
      tokens: [
        {
          patterns: [PATTERN_PRECEDENCE.indexOf('GREEDYDATA')],
          excludedPatterns: [],
          values: [],
        },
      ],
      whitespace: { minLeading: 0, maxLeading: 0, minTrailing: 0, maxTrailing: 0 },
    });
  }

  return normalizedColumns;
}
