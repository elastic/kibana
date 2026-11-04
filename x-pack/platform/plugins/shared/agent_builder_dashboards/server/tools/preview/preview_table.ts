/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PreviewTable } from './types';

export const DATE_TYPES: ReadonlySet<string> = new Set(['date', 'date_nanos']);
export const NUMBER_TYPES: ReadonlySet<string> = new Set([
  'long',
  'integer',
  'double',
  'unsigned_long',
  'counter_long',
  'counter_double',
  'counter_integer',
]);

/** Returns the ES|QL type of a result column, or undefined when the result has no such column. */
export const getColumnType = ({ columns }: PreviewTable, name: string): string | undefined =>
  columns.find((column) => column.name === name)?.type;

/** Turns an ES|QL result into one object per row, keyed by column name, with dates as epoch ms. */
export const toRows = ({ columns, values }: PreviewTable): Array<Record<string, unknown>> =>
  values.map((row) =>
    Object.fromEntries(
      columns.map(({ name, type }, index) => {
        const value = row[index];
        return [
          name,
          DATE_TYPES.has(type) && typeof value === 'string' ? Date.parse(value) : value,
        ];
      })
    )
  );

/** Returns the ES|QL query of a chart config whose `data_source` sits at the top level. */
export const getDataSourceQuery = ({
  data_source: dataSource,
}: {
  data_source?: { type?: string; query?: string };
}): string | undefined => (dataSource?.type === 'esql' ? dataSource.query : undefined);
