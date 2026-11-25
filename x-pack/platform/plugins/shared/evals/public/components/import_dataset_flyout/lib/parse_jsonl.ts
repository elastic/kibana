/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ParseImportFileResult } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const parseJsonl = (contents: string): ParseImportFileResult => {
  const columns = new Set<string>();
  const rows: ParseImportFileResult['rows'] = [];
  const errors: ParseImportFileResult['errors'] = [];

  contents.split(/\r?\n/).forEach((line, lineIndex) => {
    if (line.trim() === '') {
      return;
    }

    const rowNumber = lineIndex + 1;
    try {
      const parsed: unknown = JSON.parse(line);
      if (!isRecord(parsed)) {
        errors.push({ rowNumber, message: 'Expected a JSON object.' });
        return;
      }

      Object.keys(parsed).forEach((column) => columns.add(column));
      rows.push({ rowNumber, values: parsed });
    } catch (error) {
      errors.push({
        rowNumber,
        message: error instanceof Error ? error.message : 'Invalid JSON.',
      });
    }
  });

  return { columns: [...columns], rows, errors };
};
