/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ESQL_SOURCE_EARLIEST_COLUMN = 'esql_source_earliest';
export const ESQL_SOURCE_LATEST_COLUMN = 'esql_source_latest';

const PLAIN_IDENTIFIER = /^[A-Za-z_@][\w@]*(?:\.[\w@]+)*$/;
const SOURCE_COMMAND = /^\s*(?:FROM|TS)\s+([^|]*)/i;
const METADATA_CLAUSE = /\s+METADATA\b[\s\S]*$/i;

const stripComments = (query: string): string =>
  query.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');

const quoteIdentifier = (field: string): string =>
  PLAIN_IDENTIFIER.test(field) ? field : `\`${field.replace(/`/g, '``')}\``;

/**
 * Extracts the index pattern list from the leading `FROM` / `TS` command of a
 * query (dropping any `METADATA` clause), or `undefined` when the query does
 * not start with one. A best-effort text scan, not an ES|QL parser.
 */
export const getEsqlQuerySource = (query: string): string | undefined => {
  const match = SOURCE_COMMAND.exec(stripComments(query));
  const source = match?.[1].replace(METADATA_CLAUSE, '').trim();

  return source ? source : undefined;
};

/**
 * Builds the query that resolves the earliest / latest value of the raw
 * `source_time_field` in the query's source (ignoring the rest of the user's
 * pipeline): `FROM <source> | STATS earliest = MIN(<field>), latest = MAX(<field>)`.
 * Returns `undefined` when the source or the field is unknown.
 */
export const buildSourceTimeBoundsQuery = (
  query: string,
  sourceTimeField: string
): string | undefined => {
  const source = getEsqlQuerySource(query);
  const field = sourceTimeField.trim();

  if (source === undefined || field === '') return undefined;

  const quotedField = quoteIdentifier(field);

  return (
    `FROM ${source} | STATS ${ESQL_SOURCE_EARLIEST_COLUMN} = MIN(${quotedField}), ` +
    `${ESQL_SOURCE_LATEST_COLUMN} = MAX(${quotedField})`
  );
};

export interface SourceTimeBounds {
  /** ISO-8601 (UTC) timestamp of the earliest document. */
  earliest: string;
  /** ISO-8601 (UTC) timestamp of the latest document. */
  latest: string;
}

const toIso = (value: unknown): string | undefined => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;

  const time = new Date(value).getTime();

  return Number.isNaN(time) ? undefined : new Date(time).toISOString();
};

/**
 * Reads the bounds out of a `buildSourceTimeBoundsQuery` response. Returns
 * `undefined` for an empty source (`MIN`/`MAX` over no rows yield `null`) or an
 * unparseable value.
 */
export const parseSourceTimeBounds = (response: {
  columns?: Array<{ name: string }>;
  values?: unknown[][];
}): SourceTimeBounds | undefined => {
  const names = (response.columns ?? []).map(({ name }) => name);
  const row = response.values?.[0];
  const earliestIndex = names.indexOf(ESQL_SOURCE_EARLIEST_COLUMN);
  const latestIndex = names.indexOf(ESQL_SOURCE_LATEST_COLUMN);

  if (row === undefined || earliestIndex === -1 || latestIndex === -1) return undefined;

  const earliest = toIso(row[earliestIndex]);
  const latest = toIso(row[latestIndex]);

  return earliest === undefined || latest === undefined ? undefined : { earliest, latest };
};
