/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PATTERN_PRECEDENCE, TOKEN_SPLIT_CHARS } from '../constants';
import { isCollapsibleToken } from '../review/get_review_fields';
import type { NormalizedColumn, NamedColumn } from '../types';

/**
 * Determine which columns contain useful information and collapse the rest into a single GREEDYDATA column.
 */
export function getUsefulColumns(columns: NormalizedColumn[]): NamedColumn[] {
  let counter: number = 1;
  function uniqueId() {
    return String(counter++);
  }

  const namedColumns = columns.map<NamedColumn>((column) => {
    return {
      tokens: column.tokens.map(({ values, patterns }) => {
        const pattern = PATTERN_PRECEDENCE[patterns[0]];
        return {
          id: !TOKEN_SPLIT_CHARS.includes(pattern) ? `field_${uniqueId()}` : undefined,
          pattern,
          values,
        };
      }),
      whitespace: column.whitespace,
    };
  });

  const usefulColumns = namedColumns.slice(
    0,
    Math.max(
      // Find last column that is surrounded by variable whitespace (this indicates intentional separation so should not be collapsed into GREEDYDATA)
      namedColumns.findLastIndex((col) => {
        const leadingWhitespaceRange = col.whitespace.maxLeading - col.whitespace.minLeading;
        const trailingWhitespaceRange = col.whitespace.maxTrailing - col.whitespace.minTrailing;
        return leadingWhitespaceRange > 0 || trailingWhitespaceRange > 0;
      }),
      // Find last column that is not just freeform text (the rest can be collapsed into GREEDYDATA)
      namedColumns.findLastIndex((col) => {
        return col.tokens.some((token) => token.pattern && !isCollapsibleToken(token.pattern));
      }) + 1
    )
  );

  if (usefulColumns.length < namedColumns.length) {
    usefulColumns.push({
      tokens: [
        { id: namedColumns[usefulColumns.length].tokens[0].id, pattern: 'GREEDYDATA', values: [] },
      ],
      whitespace: {
        minLeading: namedColumns[usefulColumns.length].whitespace.minLeading,
        maxLeading: namedColumns[usefulColumns.length].whitespace.maxLeading,
        minTrailing: namedColumns[namedColumns.length - 1].whitespace.minTrailing,
        maxTrailing: namedColumns[namedColumns.length - 1].whitespace.maxTrailing,
      },
    });
  }

  return usefulColumns;
}
