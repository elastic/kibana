/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PATTERN_PRECEDENCE, TOKEN_SPLIT_CHARS } from '../constants';
import { isCollapsiblePattern } from '../review/get_review_fields';
import type {
  NormalizedColumn,
  GrokPatternGroup,
  GrokPatternNode,
  NamedFieldNode,
  LiteralValueNode,
} from '../types';
import { isNamedField } from '../utils';

/**
 * Analyzes and processes an array of normalized columns to identify and retain
 * columns with meaningful data, collapsing the rest into a single GREEDYDATA column.
 */
export function getUsefulGroups(columns: NormalizedColumn[]): GrokPatternGroup[] {
  let counter: number = 1;

  // Generates a unique ID for each field
  function uniqueId() {
    return String(counter++);
  }

  // Maps normalized columns to named columns by assigning unique IDs to tokens
  // and determining their patterns based on precedence.
  const namedColumns = columns.map<GrokPatternGroup>((column) => {
    return {
      tokens: column.tokens.map<GrokPatternNode>(({ values, patterns }) => {
        const pattern = PATTERN_PRECEDENCE[patterns[0]];
        // If the pattern is a split character, return it as a literal value
        if (TOKEN_SPLIT_CHARS.includes(pattern)) {
          return { pattern } as LiteralValueNode;
        }
        // Otherwise, create a named field
        return {
          id: `field_${uniqueId()}`,
          component: pattern,
          values,
        } as NamedFieldNode;
      }),
      whitespace: column.whitespace,
    };
  });

  // Identifies the subset of columns that are "useful" based on two criteria:
  // 1. Columns surrounded by variable whitespace (indicating intentional separation).
  // 2. Columns containing tokens with patterns that are not collapsible.
  const usefulColumns = namedColumns.slice(
    0,
    Math.max(
      namedColumns.findLastIndex((col) => {
        const leadingWhitespaceRange = col.whitespace.maxLeading - col.whitespace.minLeading;
        const trailingWhitespaceRange = col.whitespace.maxTrailing - col.whitespace.minTrailing;
        return leadingWhitespaceRange > 0 || trailingWhitespaceRange > 0;
      }),
      namedColumns.findLastIndex((column) => {
        return column.tokens.some((node) => {
          if (isNamedField(node)) {
            return !isCollapsiblePattern(node.component);
          }
          return node.pattern.trim();
        });
      }) + 1
    )
  );

  // If there are remaining columns after the "useful" ones, collapse them into
  // a single GREEDYDATA column and append it to the useful columns.
  if (usefulColumns.length < namedColumns.length) {
    const greedyDataNamedField = namedColumns
      .slice(usefulColumns.length)
      .flatMap((col) => col.tokens)
      .find(isNamedField);
    usefulColumns.push({
      tokens: [
        {
          id: greedyDataNamedField ? greedyDataNamedField.id : `field_${uniqueId()}`,
          component: 'GREEDYDATA',
          values: [],
        },
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
