/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ImportFieldMapping } from './types';

const INPUT_COLUMNS = new Set(['input', 'question', 'prompt', 'query']);
const OUTPUT_COLUMNS = new Set([
  'output',
  'answer',
  'expected',
  'reference',
  'ground_truth',
  'completion',
]);

export const suggestMapping = (columns: string[]): ImportFieldMapping =>
  Object.fromEntries(
    columns.map((column) => {
      const normalizedColumn = column.trim().toLowerCase();
      if (INPUT_COLUMNS.has(normalizedColumn)) {
        return [column, 'input'];
      }
      if (OUTPUT_COLUMNS.has(normalizedColumn)) {
        return [column, 'output'];
      }
      return [column, 'metadata'];
    })
  );
