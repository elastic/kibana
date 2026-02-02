/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DelimiterNode, DissectField } from './types';

/**
 * Extract variable regions (fields) between delimiters
 *
 * Algorithm:
 * 1. Handle content before first delimiter (if any)
 * 2. Extract content between each pair of delimiters
 * 3. Handle content after last delimiter (if any)
 * 4. Create field objects with sample values and positions
 */
export function extractFields(messages: string[], delimiterTree: DelimiterNode[]): DissectField[] {
  if (messages.length === 0) {
    return [];
  }

  const fields: DissectField[] = [];

  // If no delimiters, treat entire message as single field
  if (delimiterTree.length === 0) {
    return [
      {
        name: 'message',
        values: messages,
        position: 0,
      },
    ];
  }

  // Handle content before first delimiter
  const firstDelimiter = delimiterTree[0];
  if (firstDelimiter.positions[0] > 0) {
    const values = messages.map((msg, idx) => {
      const end = firstDelimiter.positions[idx];
      return msg.substring(0, end);
    });

    if (values.some((v) => v.length > 0)) {
      fields.push({
        name: `field_${fields.length + 1}`,
        values,
        position: 0,
      });
    }
  }

  // Extract fields between delimiters
  for (let i = 0; i < delimiterTree.length - 1; i++) {
    const current = delimiterTree[i];
    const next = delimiterTree[i + 1];

    const values = messages.map((msg, idx) => {
      const start = current.positions[idx] + current.literal.length;
      const end = next.positions[idx];
      return msg.substring(start, end);
    });

    // Only add field if it has content
    if (values.some((v) => v.length > 0)) {
      const position = current.positions[0] + current.literal.length;
      fields.push({
        name: `field_${fields.length + 1}`,
        values,
        position,
      });
    }
  }

  // Handle content after last delimiter
  const lastDelimiter = delimiterTree[delimiterTree.length - 1];
  const lastFieldValues = messages.map((msg, idx) => {
    const start = lastDelimiter.positions[idx] + lastDelimiter.literal.length;
    return msg.substring(start);
  });

  if (lastFieldValues.some((v) => v.length > 0)) {
    const position = lastDelimiter.positions[0] + lastDelimiter.literal.length;
    fields.push({
      name: `field_${fields.length + 1}`,
      values: lastFieldValues,
      position,
    });
  }

  return fields;
}
