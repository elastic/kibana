/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DissectField, DelimiterNode } from './types';

/**
 * Normalizes field boundaries by detecting common trailing non-alphanumeric characters
 * that should be part of the delimiter instead of the field value.
 *
 * For example, if all values in a field end with ':', this function will:
 * 1. Remove ':' from all field values
 * 2. Add ':' to the beginning of the following delimiter
 *
 * This handles cases like:
 * - 'sshd(pam_unix)[11741]:' -> 'sshd(pam_unix)[11741]' + ': '
 * - 'su(pam_unix)[10583]:' -> 'su(pam_unix)[10583]' + ': '
 * - 'logrotate:' -> 'logrotate' + ': '
 *
 * @param fields - Array of fields extracted between delimiters
 * @param delimiterTree - Array of delimiter nodes (will be modified in-place)
 * @returns Modified fields array with normalized boundaries
 */
export function normalizeFieldBoundaries(
  fields: DissectField[],
  delimiterTree: DelimiterNode[]
): DissectField[] {
  // Process each field (except the last one, which has no following delimiter)
  for (let i = 0; i < fields.length - 1; i++) {
    const field = fields[i];
    const nextDelimiterIndex = i; // delimiterTree index corresponds to field index for following delimiters

    // Check if delimiter tree has a corresponding delimiter
    if (nextDelimiterIndex >= delimiterTree.length) {
      continue;
    }

    // Check if all values end with the same non-alphanumeric character
    const lastChars = field.values.map((val) => (val.length > 0 ? val[val.length - 1] : ''));

    // Skip if any value is empty
    if (lastChars.some((char) => char === '')) {
      continue;
    }

    // Check if all last characters are the same
    const firstChar = lastChars[0];
    if (!lastChars.every((char) => char === firstChar)) {
      continue;
    }

    // Check if the character is non-alphanumeric
    if (/[a-zA-Z0-9]/.test(firstChar)) {
      continue;
    }

    // ONLY normalize if ALL field values have length > 0 AFTER removing the trailing char
    const normalizedValues = field.values.map((val) => val.slice(0, -1));
    if (normalizedValues.some((val) => val.length === 0)) {
      // Don't normalize if it would create empty fields
      continue;
    }

    // Move the trailing character from field values to the delimiter
    field.values = normalizedValues;

    // Add the character to the beginning of the next delimiter
    const nextDelimiter = delimiterTree[nextDelimiterIndex];
    nextDelimiter.literal = firstChar + nextDelimiter.literal;
    // Note: positions don't change because we're conceptually moving the character
    // from the end of the field to the start of the delimiter, but the position
    // of where the delimiter "starts" in terms of parsing is now one character earlier
    nextDelimiter.positions = nextDelimiter.positions.map((pos) => pos - 1);
  }

  return fields;
}
