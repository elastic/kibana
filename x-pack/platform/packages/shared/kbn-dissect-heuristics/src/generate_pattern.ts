/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DelimiterNode, DissectField } from './types';

/**
 * Generate a Dissect pattern string from delimiters and fields
 *
 * Algorithm:
 * 1. Interleave delimiters and fields in order
 * 2. Format fields with appropriate modifiers
 * 3. Handle edge cases (no delimiters, fields before first delimiter)
 */
export function generatePattern(delimiterTree: DelimiterNode[], fields: DissectField[]): string {
  if (fields.length === 0) {
    return '';
  }

  // If no delimiters, return single field pattern
  if (delimiterTree.length === 0) {
    return formatField(fields[0]);
  }

  const parts: string[] = [];
  let fieldIndex = 0;

  // Check if there's a field before the first delimiter
  const firstDelimiter = delimiterTree[0];
  if (fields[0] && fields[0].position < firstDelimiter.medianPosition) {
    parts.push(formatField(fields[fieldIndex]));
    fieldIndex++;
  }

  // Interleave delimiters and fields
  for (let i = 0; i < delimiterTree.length; i++) {
    const delimiter = delimiterTree[i];

    // Add delimiter (escape if needed)
    parts.push(delimiter.literal);

    // Add field after this delimiter (if exists)
    if (fieldIndex < fields.length) {
      parts.push(formatField(fields[fieldIndex]));
      fieldIndex++;
    }
  }

  return parts.join('');
}

/**
 * Format a field with its modifiers into Dissect syntax
 */
function formatField(field: DissectField): string {
  const modifiers = field.modifiers || {};

  // Handle skip fields
  if (modifiers.skip) {
    if (modifiers.namedSkip) {
      return `%{?${field.name}}`;
    }
    return '%{}';
  }

  // Handle right padding
  if (modifiers.rightPadding) {
    return `%{${field.name}->}`;
  }

  // Standard field
  return `%{${field.name}}`;
}
