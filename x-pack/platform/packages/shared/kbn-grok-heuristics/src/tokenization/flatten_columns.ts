/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NamedColumn, NamedToken } from '../types';

/**
 * Flatten columns and inline whitespace and delimiter characters.
 */
export function flattenColumns(columns: NamedColumn[], delimiter: string): NamedToken[] {
  return columns.reduce<NamedToken[]>((acc, col, i) => {
    let { minLeading, maxLeading } = col.whitespace;

    if (i > 0) {
      if (delimiter !== '\\s') {
        acc.push({ pattern: delimiter, id: undefined, values: [] });
      } else {
        // Increment leading whitespace by one to account for the delimiter. This simplifies the GROK pattern by combining the delimiter and leading whitespace into a single token.
        minLeading += 1;
        maxLeading += 1;
      }
    }

    if (minLeading === 1 && maxLeading === 1) {
      acc.push({ pattern: '\\s', id: undefined, values: [] });
    } else if (minLeading >= 1) {
      acc.push({ pattern: '\\s+', id: undefined, values: [] });
    } else if (maxLeading >= 1) {
      acc.push({ pattern: '\\s*', id: undefined, values: [] });
    }

    acc.push(...col.tokens);

    if (col.whitespace.minTrailing === 1 && col.whitespace.maxTrailing === 1) {
      acc.push({ pattern: '\\s', id: undefined, values: [] });
    } else if (col.whitespace.minTrailing >= 1) {
      acc.push({ pattern: '\\s+', id: undefined, values: [] });
    } else if (col.whitespace.maxTrailing >= 1) {
      acc.push({ pattern: '\\s*', id: undefined, values: [] });
    }

    return acc;
  }, []);
}
