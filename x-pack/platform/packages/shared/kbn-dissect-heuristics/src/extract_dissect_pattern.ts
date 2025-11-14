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
import { detectModifiers } from './detect_modifiers';
import { generatePattern } from './generate_pattern';
import { findStructuredPrefixLength } from './utils';

/**
 * Check if a pattern has poor quality (contains suspicious literal characters
 * that suggest delimiter detection failed)
 */
function hasLowQualityPattern(pattern: string): boolean {
  // Remove all field placeholders to get just the literal parts
  const literalParts = pattern.replace(/%\{[^}]+\}/g, '');

  // Check for unbalanced brackets/parentheses - a sign of bad parsing
  const openParen = (literalParts.match(/\(/g) || []).length;
  const closeParen = (literalParts.match(/\)/g) || []).length;
  const openBracket = (literalParts.match(/\[/g) || []).length;
  const closeBracket = (literalParts.match(/\]/g) || []).length;

  // If we have unbalanced brackets/parens, it's a bad pattern
  if (openParen !== closeParen || openBracket !== closeBracket) {
    return true;
  }

  return false;
}

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

  // Step 3.5: Normalize field boundaries (move trailing non-alphanumeric chars to delimiters)
  normalizeFieldBoundaries(fields, delimiterTree);

  // Step 4: Detect modifiers for each field
  fields.forEach((field) => {
    field.modifiers = detectModifiers(field);
  });

  // Step 5: Generate pattern string
  const pattern = generatePattern(delimiterTree, fields);

  // Check if we got a useful pattern (at least 2 fields and good quality)
  // If not, try space-based extraction as a fallback for structured logs
  const needsFallback = fields.length < 2 || hasLowQualityPattern(pattern);

  if (needsFallback && messages.length > 1) {
    // Try forcing space as a delimiter for structured logs
    const spaceDelimiters = [' '];
    const spaceDelimiterTree = buildDelimiterTree(messages, spaceDelimiters);
    const spaceFields = extractFields(messages, spaceDelimiterTree);

    // Normalize field boundaries for space-based extraction too
    normalizeFieldBoundaries(spaceFields, spaceDelimiterTree);

    // If space-based extraction gives us more fields, use it
    if (spaceFields.length >= 2) {
      // Add modifiers to fields
      spaceFields.forEach((field) => {
        field.modifiers = detectModifiers(field);
      });

      const spacePattern = generatePattern(spaceDelimiterTree, spaceFields);

      return {
        pattern: spacePattern,
        fields: spaceFields,
      };
    }
  }

  // Original prefix-based fallback (keeping for other cases)
  if (fields.length < 2 && messages.length > 1) {
    // Use token-based structured prefix detection
    const structuredPrefixLength = findStructuredPrefixLength(messages);

    // If we found a meaningful structured prefix (longer than simple char-by-char match)
    if (structuredPrefixLength > 10) {
      const prefixMessages = messages.map((msg) => msg.substring(0, structuredPrefixLength));

      // Re-run extraction on just the prefix
      const prefixDelimiters = findDelimiterSequences(prefixMessages);
      const prefixDelimiterTree = buildDelimiterTree(prefixMessages, prefixDelimiters);
      const prefixFields = extractFields(prefixMessages, prefixDelimiterTree);

      // If prefix extraction worked better, use it and add a catch-all field for the rest
      if (prefixFields.length >= 2) {
        // Add modifiers to prefix fields
        prefixFields.forEach((field) => {
          field.modifiers = detectModifiers(field);
        });

        // Add a catch-all field for the variable suffix
        const suffixValues = messages.map((msg) => msg.substring(structuredPrefixLength));
        prefixFields.push({
          name: `field_${prefixFields.length + 1}`,
          values: suffixValues,
          position: structuredPrefixLength,
        });

        const prefixPattern = generatePattern(prefixDelimiterTree, prefixFields.slice(0, -1));
        const fullPattern = prefixPattern + `%{field_${prefixFields.length}}`;

        return {
          pattern: fullPattern,
          fields: prefixFields,
        };
      }
    }
  }

  // If we got here, use the original pattern
  return {
    pattern,
    fields,
  };
}
