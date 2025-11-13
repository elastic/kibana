/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DissectPattern } from './types';
import { findDelimiterSequences } from './find_delimiter_sequences';
import { buildDelimiterTree } from './build_delimiter_tree';
import { extractFields } from './extract_fields';
import { detectModifiers } from './detect_modifiers';
import { generatePattern } from './generate_pattern';

/**
 * WARNING: DO NOT RUN THIS FUNCTION ON THE MAIN THREAD
 *
 * Extracts a Dissect pattern from an array of log messages by analyzing
 * common delimiters and structure.
 *
 * This function performs multiple passes to identify consistent delimiter patterns
 * and normalize the data into a structured format. It is computationally intensive
 * and should not be run on the main thread.
 *
 * Steps:
 * 1. Find common delimiter sequences that appear in all messages.
 * 2. Build an ordered delimiter tree by position.
 * 3. Extract variable regions between delimiters as fields.
 * 4. Detect modifiers (right padding, skip fields).
 * 5. Generate the final Dissect pattern string.
 *
 * @param messages - Array of log message strings to analyze
 * @returns DissectPattern object with pattern string and field metadata
 */
export function extractDissectPatternDangerouslySlow(messages: string[]): DissectPattern {
  if (!messages.length) {
    return {
      pattern: '',
      fields: [],
    };
  }

  // Step 1: Find common delimiter sequences
  const delimiters = findDelimiterSequences(messages);

  // Step 2: Build ordered delimiter tree
  const delimiterTree = buildDelimiterTree(messages, delimiters);

  // Step 3: Extract fields between delimiters
  const fields = extractFields(messages, delimiterTree);

  // Step 4: Detect modifiers for each field
  fields.forEach((field) => {
    field.modifiers = detectModifiers(field);
  });

  // Step 5: Generate pattern string
  const pattern = generatePattern(delimiterTree, fields);

  return {
    pattern,
    fields,
  };
}
