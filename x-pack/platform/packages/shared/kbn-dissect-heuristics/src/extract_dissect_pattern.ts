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
import { normalizeFieldBoundaries } from './normalize_field_boundaries';
import { normalizeWhitespace, needsRightPadding } from './normalize_whitespace';
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

  // Step 0: Normalize whitespace to handle varying amounts of spaces/tabs
  // This ensures delimiters align at consistent positions across all messages
  const normalizedMessages = normalizeWhitespace(messages);
  const normalizedStrings = normalizedMessages.map((nm) => nm.normalized);

  // Step 1: Find common delimiter sequences (on normalized messages)
  const delimiters = findDelimiterSequences(normalizedStrings);

  // Step 2: Build ordered delimiter tree (on normalized messages)
  const delimiterTree = buildDelimiterTree(normalizedStrings, delimiters);

  // Step 3: Extract fields between delimiters (on normalized messages)
  const fields = extractFields(normalizedStrings, delimiterTree);

  // Step 3.5: Normalize field boundaries (move trailing non-alphanumeric chars to delimiters)
  normalizeFieldBoundaries(fields, delimiterTree);

  // Step 4: Detect modifiers for each field
  fields.forEach((field, index) => {
    field.modifiers = detectModifiers(field);

    // Apply right-padding modifier based on delimiter positions
    // Find the delimiter that comes after this field by comparing positions
    // Use MIN length since we want to find the delimiter that appears right after
    // the shortest value of this field (where the field ends in all messages)
    const minFieldLength = Math.min(...field.values.map((v) => v.length));
    const fieldEndMin = field.position + minFieldLength;
    const nextDelimiter = delimiterTree.find((d) => Math.min(...d.positions) >= fieldEndMin);

    if (nextDelimiter && nextDelimiter.positions.length > 0) {
      // Check if this delimiter appears at varying positions or where whitespace was collapsed
      if (needsRightPadding(nextDelimiter.positions, normalizedMessages, nextDelimiter.literal)) {
        field.modifiers.rightPadding = true;
      }
    }
  });

  // Step 5: Generate pattern string
  const pattern = generatePattern(delimiterTree, fields);

  return {
    pattern,
    fields,
  };
}
