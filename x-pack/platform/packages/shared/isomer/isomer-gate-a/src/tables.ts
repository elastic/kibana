/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { ChartData } from '@kbn/isomer';
import type { Difference } from './compare';

const show = (value: unknown): string => JSON.stringify(value);

/**
 * A cell as it compares across Kibana's paths: ES|QL returns dates as ISO strings, and Lens's
 * pipeline as epoch milliseconds, for the same instant.
 */
const comparable = (value: unknown, type: string): unknown =>
  type === 'date' && typeof value === 'string' && !Number.isNaN(Date.parse(value))
    ? Date.parse(value)
    : value === undefined
    ? null
    : value;

const rowKey = (row: unknown[]): string => show(row);

/**
 * Every way `actual`, the table our pipeline queried, differs from `expected`, Kibana's, for the
 * columns Kibana's table has. Columns match by id and type; rows must hold the same values in the
 * same order. Columns only `actual` has are not differences: Lens keeps only the columns a chart
 * reads. An empty list is a pass.
 */
export const compareTables = (expected: Datatable, actual: Datatable): Difference[] => {
  const differences: Difference[] = [];
  const actualColumns = new Map(actual.columns.map((column) => [column.id, column]));
  const columns = expected.columns.filter(({ id, meta }) => {
    const column = actualColumns.get(id);
    if (!column) {
      differences.push(`column ${show(id)} is missing`);
      return false;
    }
    if (column.meta.type !== meta.type) {
      differences.push(`column ${show(id)} type ${show(meta.type)} vs ${show(column.meta.type)}`);
    }
    return true;
  });
  if (expected.rows.length !== actual.rows.length) {
    differences.push(`row count ${expected.rows.length} vs ${actual.rows.length}`);
    return differences;
  }
  const project = (row: Datatable['rows'][number]) =>
    columns.map(({ id, meta }) => comparable(row[id], meta.type));
  const expectedRows = expected.rows.map(project);
  const actualRows = actual.rows.map(project);
  const mismatches = expectedRows.flatMap((row, index) =>
    rowKey(row) === rowKey(actualRows[index])
      ? []
      : [`row ${index + 1} ${rowKey(row)} vs ${rowKey(actualRows[index])}`]
  );
  if (mismatches.length === 0) {
    return differences;
  }
  const sorted = (rows: unknown[][]) => rows.map(rowKey).sort().join('\n');
  return sorted(expectedRows) === sorted(actualRows)
    ? [...differences, 'rows are the same, in a different order']
    : [...differences, ...mismatches];
};

/**
 * The `Datatable` a materialized chart's data came from: each column's Kibana `source` column,
 * and its rows as they were queried. Throws for data that didn't come from one Kibana table.
 */
export const datatableFromChartData = ({ columns, rows }: ChartData): Datatable => ({
  type: 'datatable',
  columns: columns.map(({ id, source }) => {
    const column = (source as { kind?: string; column?: Datatable['columns'][number] } | undefined)
      ?.column;
    if (!column) {
      throw new Error(`Column ${show(id)} has no Kibana source column.`);
    }
    return column;
  }),
  rows: rows.map((row) =>
    Object.fromEntries(
      columns.map(({ source }, index) => [
        (source as { column: Datatable['columns'][number] }).column.id,
        row[index],
      ])
    )
  ),
});
