/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import type { ESQLSearchResponse } from '@kbn/es-types';

/**
 * A {@link ComposerQuery} branded with the row shape it is expected to produce.
 * `__row` is never read at runtime — it only carries `TRow` for inference.
 */
export type TypedEsqlQuery<TRow> = ComposerQuery & {
  readonly __row?: TRow;
};

export const asTypedEsqlQuery = <TRow>(query: ComposerQuery): TypedEsqlQuery<TRow> =>
  query as TypedEsqlQuery<TRow>;

/**
 * Converts a tabular ES|QL response into row objects, with `TRow` inferred from
 * the branded query (so callers cannot pair a query with the wrong row type).
 */
export const rowsFromEsql = <TRow extends object>(
  _query: TypedEsqlQuery<TRow>,
  response: ESQLSearchResponse
): TRow[] => {
  const names = response.columns.map((c) => c.name);
  return response.values.map((row) => {
    const obj: Record<string, unknown> = {};
    names.forEach((name, i) => {
      obj[name] = row[i];
    });
    return obj as TRow;
  });
};

/**
 * Asserts already-object rows (e.g. expression datatable rows) as the branded
 * query's row type. Use when the executor returns objects rather than a tabular
 * `columns`/`values` response.
 */
export const asEsqlRows = <TRow extends object>(
  _query: TypedEsqlQuery<TRow>,
  rows: readonly object[]
): TRow[] => rows as TRow[];
