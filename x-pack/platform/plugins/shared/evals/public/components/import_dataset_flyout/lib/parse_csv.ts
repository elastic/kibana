/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Papa from 'papaparse';
import type { ParseImportFileResult } from './types';

const coerceJsonCell = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  const candidate = value.trimStart();
  if (!candidate.startsWith('{') && !candidate.startsWith('[')) {
    return value;
  }

  try {
    return JSON.parse(candidate);
  } catch {
    return value;
  }
};

export const parseCsv = (contents: string): ParseImportFileResult => {
  const result = Papa.parse<Record<string, unknown>>(contents, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });
  const invalidRowIndexes = new Set(
    result.errors.flatMap(({ row }) => (row === undefined ? [] : [row]))
  );

  return {
    columns: result.meta.fields ?? [],
    rows: result.data.flatMap((values, rowIndex) => {
      if (invalidRowIndexes.has(rowIndex)) {
        return [];
      }

      return [
        {
          rowNumber: rowIndex + 1,
          values: Object.fromEntries(
            Object.entries(values).map(([column, value]) => [column, coerceJsonCell(value)])
          ),
        },
      ];
    }),
    errors: result.errors.map(({ message, row }) => ({
      rowNumber: (row ?? 0) + 1,
      message,
    })),
  };
};
