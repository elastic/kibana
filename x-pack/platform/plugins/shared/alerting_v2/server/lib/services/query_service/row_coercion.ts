/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryResponse } from '@elastic/elasticsearch/lib/api/types';

/** A single decoded ES|QL result row, keyed by column name. */
export type EsqlRow = Record<string, unknown>;

/**
 * Normalizes an ES|QL `date` / `date_nanos` value to integer epoch millis, handling both response formats.
 */
const toEpochMillis = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(toEpochMillis);
  } else if (typeof value === 'string') {
    const millis = Date.parse(value);
    // Defensive: date-typed columns are always parseable ISO-8601, so this
    // fallback is unreachable in practice; keep the raw string over `NaN`.
    return Number.isNaN(millis) ? value : millis;
  } else if (typeof value === 'number') {
    return Math.trunc(value);
  }

  return value;
};

/**
 * Coerces a raw row into a plain object in a single pass.
 *
 * Apache Arrow returns BigInt for integer/long columns.
 * JSON.stringify cannot serialize BigInt, so we coerce to Number
 * at the parsing boundary. ES|QL integer values are within safe
 * Number range.
 * Columns listed in `dateColumns` are normalized to integer epoch millis instead, via {@link toEpochMillis}.
 */
export const coerceRow = (row: EsqlRow, dateColumns?: ReadonlySet<string>): EsqlRow => {
  const coerced: EsqlRow = {};

  for (const [key, value] of Object.entries(row)) {
    if (dateColumns?.has(key)) {
      coerced[key] = toEpochMillis(value);
    } else {
      coerced[key] = typeof value === 'bigint' ? Number(value) : value;
    }
  }

  return coerced;
};

/**
 * Builds row objects from an ES|QL JSON response.
 *
 * `normalizeDates` coerces `date` / `date_nanos` columns to integer epoch millis
 * via {@link toEpochMillis}, keeping the JSON and Arrow formats consistent. It
 * defaults to `false` because the `executeQueryRows` callers expect ISO-8601 date
 * strings today; only the streaming path, which must match Arrow format, opts in.
 */
export const toRows = <T = EsqlRow>(
  response: EsqlQueryResponse,
  { normalizeDates = false }: { normalizeDates?: boolean } = {}
): T[] => {
  const columnNames = response.columns.map((column) => column.name);
  const dateColumnNames = normalizeDates
    ? new Set(
        response.columns
          .filter((column) => column.type === 'date' || column.type === 'date_nanos')
          .map((column) => column.name)
      )
    : undefined;

  return response.values.map((valueRow) => {
    const row = columnNames.reduce<EsqlRow>((acc, columnName, index) => {
      acc[columnName] = valueRow[index];
      return acc;
    }, {});

    return coerceRow(row, dateColumnNames) as T;
  });
};
