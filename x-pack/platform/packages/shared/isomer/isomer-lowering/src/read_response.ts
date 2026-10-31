/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlResponseSchema, isBoundedJson } from './schema';
import type { LensQueryPlan, LensResponseResult, LoweringDiagnostic } from './types';

/** Validate a complete ES|QL response and project its values into Lens column order. */
export const readLensResponse = (query: LensQueryPlan, input: unknown): LensResponseResult => {
  if (!isBoundedJson(input)) {
    return {
      status: 'invalid',
      diagnostics: [
        {
          code: 'lens.response.invalid-json',
          message: 'Expected bounded, finite JSON response',
          path: [],
        },
      ],
    };
  }
  const parsed = esqlResponseSchema.safeParse(JSON.parse(JSON.stringify(input)));
  if (!parsed.success) {
    return {
      status: 'invalid',
      diagnostics: parsed.error.issues.map(({ message, path }) => ({
        code: 'lens.response.invalid-shape',
        message,
        path: path.map((entry) => (typeof entry === 'symbol' ? String(entry) : entry)),
      })),
    };
  }
  const { columns, values, is_partial: isPartial, is_running: isRunning } = parsed.data;
  const diagnostics: LoweringDiagnostic[] = [];
  if (isPartial || isRunning) {
    diagnostics.push({
      code: 'lens.response.incomplete',
      message: 'Partial or running ES|QL responses cannot be bound',
      path: [],
    });
  }
  const names = new Set<string>();
  for (const [index, column] of columns.entries()) {
    if (names.has(column.name)) {
      diagnostics.push({
        code: 'lens.response.duplicate-column',
        message: `Ambiguous ES|QL column "${column.name}"`,
        path: ['columns', index],
      });
    }
    names.add(column.name);
  }
  const indices = query.columns.map(({ fieldName }) =>
    columns.findIndex(({ name }) => name === fieldName)
  );
  for (const [index, position] of indices.entries()) {
    if (position === -1) {
      diagnostics.push({
        code: 'lens.response.missing-column',
        message: `Missing ES|QL column "${query.columns[index].fieldName}"`,
        path: ['columns'],
      });
    }
  }
  for (const [index, row] of values.entries()) {
    if (row.length !== columns.length) {
      diagnostics.push({
        code: 'lens.response.row-width',
        message: 'Row width does not match ES|QL response columns',
        path: ['values', index],
      });
    }
  }
  if (diagnostics.length > 0) {
    return { status: 'invalid', diagnostics };
  }
  return {
    status: 'ready',
    table: {
      layerId: query.layerId,
      columns: query.columns.map((lens, index) => ({
        lens,
        responseType: columns[indices[index]].type,
      })),
      rows: values.map((row) => indices.map((index) => row[index])),
    },
  };
};
