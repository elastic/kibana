/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Buffer } from 'buffer';
import {
  ESQL_RESULTS_MAX_BYTES_PER_EXECUTION,
  ESQL_RESULTS_MAX_ROWS_PER_EXECUTION,
  type EsqlResultRow,
} from '../../../common';

const SERIALIZED_ARRAY_OVERHEAD_BYTES = 2;

interface EsqlResultHit {
  _source?: unknown;
}

interface EsqlResultsBudget {
  remainingRows: number;
  remainingBytes: number;
}

interface BoundedEsqlResults {
  results: EsqlResultRow[];
  totalCount: number;
  storedCount: number;
  truncated: boolean;
  remainingBudget: EsqlResultsBudget;
}

export const createEsqlResultsBudget = (): EsqlResultsBudget => ({
  remainingRows: ESQL_RESULTS_MAX_ROWS_PER_EXECUTION,
  remainingBytes: ESQL_RESULTS_MAX_BYTES_PER_EXECUTION,
});

export const getBoundedEsqlResults = (
  hits: EsqlResultHit[],
  budget: EsqlResultsBudget
): BoundedEsqlResults => {
  const rows = hits.flatMap(({ _source }) => (isEsqlResultRow(_source) ? [_source] : []));
  const results: EsqlResultRow[] = [];
  let { remainingRows } = budget;
  let remainingBytes = Math.max(budget.remainingBytes - SERIALIZED_ARRAY_OVERHEAD_BYTES, 0);

  for (const row of rows) {
    const serializedBytes =
      Buffer.byteLength(JSON.stringify(row), 'utf8') + (results.length > 0 ? 1 : 0);
    if (remainingRows === 0 || serializedBytes > remainingBytes) {
      break;
    }

    results.push(row);
    remainingRows -= 1;
    remainingBytes -= serializedBytes;
  }

  return {
    results,
    totalCount: rows.length,
    storedCount: results.length,
    truncated: results.length < rows.length,
    remainingBudget: { remainingRows, remainingBytes },
  };
};

const isEsqlResultRow = (value: unknown): value is EsqlResultRow =>
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.values(value).every((fieldValue) => fieldValue === null || typeof fieldValue === 'string');
