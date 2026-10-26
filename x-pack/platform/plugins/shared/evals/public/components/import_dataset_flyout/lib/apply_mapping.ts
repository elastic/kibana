/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AddExamplesPayload } from '@kbn/evals-common';
import type { ImportFieldMapping, ImportRow, ImportRowError } from './types';

export interface ApplyMappingResult {
  examples: AddExamplesPayload[];
  errors: ImportRowError[];
}

const isEmptyValue = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

export const applyMapping = (
  rows: ImportRow[],
  mapping: ImportFieldMapping
): ApplyMappingResult => {
  const examples: AddExamplesPayload[] = [];
  const errors: ImportRowError[] = [];

  rows.forEach(({ rowNumber, values }) => {
    const example: AddExamplesPayload = {};

    Object.entries(mapping).forEach(([column, destination]) => {
      const value = values[column];
      if (destination === 'ignore' || isEmptyValue(value)) {
        return;
      }

      example[destination] = { ...example[destination], [column]: value };
    });

    if (
      example.input === undefined &&
      example.output === undefined &&
      example.metadata === undefined
    ) {
      errors.push({ rowNumber, message: 'The row has no mapped values.' });
      return;
    }

    examples.push(example);
  });

  return { examples, errors };
};
