/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokPatternGroup, GrokPatternNode } from '../types';

/**
 * Flattens an array of `NamedColumn` objects into a single list of `NamedToken` objects.
 * Handles whitespace and delimiter characters by inlining them as tokens, ensuring
 * proper GROK pattern construction. Adjusts leading and trailing whitespace based on
 * column properties and the specified delimiter.
 *
 * @param columns - The array of `NamedColumn` objects to flatten.
 * @param delimiter - The delimiter string to use between columns.
 * @returns A flattened array of `NamedToken` objects.
 */
export function flattenGroups(columns: GrokPatternGroup[], delimiter: string): GrokPatternNode[] {
  return columns.reduce<GrokPatternNode[]>((accumulator, column, index) => {
    let { minLeading, maxLeading } = column.whitespace;

    if (index > 0) {
      if (delimiter !== '\\s') {
        accumulator.push({ pattern: delimiter });
      } else {
        // Increment leading whitespace by one to account for the delimiter. This simplifies the GROK pattern by combining the delimiter and leading whitespace into a single token.
        minLeading += 1;
        maxLeading += 1;
      }
    }

    if (minLeading === 1 && maxLeading === 1) {
      accumulator.push({ pattern: '\\s' });
    } else if (minLeading >= 1) {
      accumulator.push({ pattern: '\\s+' });
    } else if (maxLeading >= 1) {
      accumulator.push({ pattern: '\\s*' });
    }

    accumulator.push(...column.tokens);

    if (column.whitespace.minTrailing === 1 && column.whitespace.maxTrailing === 1) {
      accumulator.push({ pattern: '\\s' });
    } else if (column.whitespace.minTrailing >= 1) {
      accumulator.push({ pattern: '\\s+' });
    } else if (column.whitespace.maxTrailing >= 1) {
      accumulator.push({ pattern: '\\s*' });
    }

    return accumulator;
  }, []);
}
