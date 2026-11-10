/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable, DatatableRow } from '@kbn/expressions-plugin/common';
import { getBucketIdentifier } from '@kbn/expressions-plugin/common';

/** How Lens folds a breakdown's rows together. */
export type CollapseFn = 'sum' | 'avg' | 'min' | 'max';

const toNumbers = (value: unknown): number[] =>
  Array.isArray(value) ? value.map(Number) : [Number(value)];

/**
 * Lens's `lens_collapse`: one row per distinct `by` values, each metric column folded with `fn`
 * over the rows that share them, keeping only the `by` and metric columns.
 */
export const collapseTable = (
  table: Datatable,
  by: string[],
  metrics: string[],
  fn: CollapseFn
): Datatable => {
  const sums: Record<string, Record<string, number>> = {};
  const counts: Record<string, Record<string, number>> = {};
  for (const id of metrics) {
    sums[id] = {};
    counts[id] = {};
  }
  for (const row of table.rows) {
    const bucket = getBucketIdentifier(row, by);
    for (const id of metrics) {
      if (row[id] == null) {
        continue;
      }
      const numbers = toNumbers(row[id]);
      const previous = sums[id][bucket] as number | undefined;
      if (fn === 'min' || fn === 'max') {
        const pick = fn === 'min' ? Math.min : Math.max;
        sums[id][bucket] = pick(...(previous === undefined ? numbers : [previous, ...numbers]));
        continue;
      }
      sums[id][bucket] = numbers.reduce((total, number) => total + number, previous ?? 0);
      counts[id][bucket] = (counts[id][bucket] ?? 0) + numbers.length;
    }
  }

  const seen = new Set<string>();
  const rows: DatatableRow[] = [];
  for (const row of table.rows) {
    const bucket = getBucketIdentifier(row, by);
    if (seen.has(bucket)) {
      continue;
    }
    seen.add(bucket);
    const collapsed: DatatableRow = {};
    for (const id of metrics) {
      const total = sums[id][bucket] as number | undefined;
      collapsed[id] = fn === 'avg' && total !== undefined ? total / counts[id][bucket] : total;
    }
    for (const id of by) {
      collapsed[id] = row[id];
    }
    rows.push(collapsed);
  }
  return {
    ...table,
    columns: table.columns.filter(({ id }) => by.includes(id) || metrics.includes(id)),
    rows,
  };
};
