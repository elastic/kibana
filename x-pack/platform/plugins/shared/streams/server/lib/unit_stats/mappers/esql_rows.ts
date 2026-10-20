/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';

/** A cell of a column we read: a number or a string, null for no value. */
export type EsqlValue = string | number | null;

/** One row, keyed by column name. */
export type EsqlRow = Record<string, EsqlValue>;

const toValue = (value: unknown): EsqlValue =>
  typeof value === 'number' || typeof value === 'string' ? value : null;

/** One row per row of an ES|QL response, keyed by column name. */
export const toRows = ({
  columns,
  values,
}: Pick<ESQLSearchResponse, 'columns' | 'values'>): EsqlRow[] =>
  values.map((row) =>
    Object.fromEntries(columns.map(({ name }, index) => [name, toValue(row[index])]))
  );

/** The rows by the value of `idColumn`, which is left out of each row. One row per id. */
export const indexById = (rows: EsqlRow[], idColumn: string): Record<string, EsqlRow> =>
  Object.fromEntries(rows.map(({ [idColumn]: id, ...row }) => [String(id), row]));

/** The rows by the value of `idColumn`, which is left out of each row, in row order. Several rows per id. */
export const groupById = (rows: EsqlRow[], idColumn: string): Record<string, EsqlRow[]> => {
  const groups: Record<string, EsqlRow[]> = {};

  for (const { [idColumn]: id, ...row } of rows) {
    groups[String(id)] = [...(groups[String(id)] ?? []), row];
  }

  return groups;
};

/** The value when it is a number, null for anything else. */
export const numberOrNull = (value: EsqlValue | undefined): number | null =>
  typeof value === 'number' ? value : null;
