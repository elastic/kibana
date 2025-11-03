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
import { getUsefulGroups } from './get_useful_groups';
import { flattenGroups } from './flatten_groups';
import type { GrokPatternNode } from '../types';

/**
 * WARNING: DO NOT RUN THIS FUNCTION ON THE MAIN THREAD
 *
 * Extracts structured fields (nodes) from an array of log messages by analyzing
 * patterns, delimiters, and column structures.
 *
 * This function performs multiple passes to identify consistent tokenization patterns
 * and normalize the data into a structured format. It is computationally intensive
 * and should not be run on the main thread.
 *
 * Steps:
 * 1. Masks specific patterns (e.g. quoted strings, parentheses) in the messages.
 * 2. Detects the most likely delimiter (e.g. whitespace, `|`, `;`).
 * 3. Splits messages into columns using the detected delimiter and tokenizes them.
 * 4. Identifies consistent split characters for further tokenization.
 * 5. Refines tokenization using consistent split characters.
 * 6. Normalizes columns into a unified structure across all messages.
 * 7. Identifies useful columns and collapses others into a single GREEDYDATA column.
 * 8. Flattens the structured columns into a list of tokens with delimiters inlined.
 */
export function extractGrokPatternDangerouslySlow(messages: string[]): GrokPatternNode[] {
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
  const groups = getUsefulGroups(normalizedColumns);

  // 8. Flatten all columns into a single list of tokens with whitespace and delimiter characters inlined
  const nodes = flattenGroups(groups, delimiter);

  return nodes;
}
