/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeColumns } from './normalize_columns';
import { tokenizeLines } from './tokenize_lines';
import { maskFirstPassPatterns } from './mask_first_pass_patterns';
import { findDelimiter } from './find_delimiter';
import { findConsistentSplitChars } from './find_consistent_split_chars';
import { getUsefulColumns } from './get_useful_columns';
import { flattenColumns } from './flatten_columns';
import type { NamedToken } from '../types';

/**
 * Extracts structured fields from log messages.
 *
 * NOTE: DO NOT RUN THIS FUNCTION ON THE MAIN THREAD
 */
export function extractTokensDangerouslySlow(messages: string[]): NamedToken[] {
  if (!messages.length) {
    return [];
  }

  // 1. Mask messages by matching highly specific patterns, quoted strings and parenthesis
  const maskedMessages = messages.map(maskFirstPassPatterns);

  // 2. Find the most likely delimiter (e.g. `\s`, `|`, `;`)
  const delimiter = findDelimiter(maskedMessages.map(({ masked }) => masked));

  // 3. Split each message into columns (using the detected delimiter) and tokenize those columns (using all possible split chars)
  const firstPassColumnsPerLine = tokenizeLines(maskedMessages, delimiter);

  // 4. Find consistent split characters for each message by ruling out split chars that do not create consistent token counts (e.g. `[/path/to/file]` vs. `[/file]`)
  const nextPassSplitChars = findConsistentSplitChars(firstPassColumnsPerLine);

  // 5. Split each message into columns (using the detected delimiter) and tokenize them (using only the split chars that produced consistent token counts)
  const columnsPerLine = tokenizeLines(maskedMessages, delimiter, nextPassSplitChars);

  // 6. Normalize columns for each line into one single set of columns that represents a common structure
  const normalizedColumns = normalizeColumns(columnsPerLine);

  // 7. Determine which columns contain useful information and collapse the rest into a single GREEDYDATA column
  const usefulColumns = getUsefulColumns(normalizedColumns);

  // 8. Flatten the columns and inline whitespace and delimiter characters
  const tokens = flattenColumns(usefulColumns, delimiter);

  return tokens;
}
