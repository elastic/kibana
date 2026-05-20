/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import type { ESQLSearchResponse } from '@kbn/es-types';

/**
 * Composer helper: dotted field names need string-array shorthand, so each
 * segment is treated as a separate identifier (`foo.bar`, not `foo\.bar`).
 * Bare names (no dot) pass through unchanged.
 */
export const col = (field: string) => esql.col(field.includes('.') ? field.split('.') : field);

/**
 * Returns the index of the `_source` column in an ES|QL response, or `-1` when
 * the column is absent (e.g., caller did not include `METADATA _source` in
 * `FROM`, or the response was the empty shape returned by the storage adapter
 * for a missing index).
 */
export const getSourceColumnIndex = (response: ESQLSearchResponse): number =>
  response.columns.findIndex((c) => c.name === '_source');

/**
 * Maps an ES|QL response's `_source` column to typed application objects via
 * the supplied `fromStorage` deserializer. Returns `[]` when the `_source`
 * column is absent — mirroring the storage adapter's empty-shape contract on
 * a missing/uninitialised index.
 *
 * Use when a caller projects `METADATA _source` and only needs the `_source`
 * cell on each row. For richer projections (e.g. `_id + _source`), read both
 * column indices directly with `getSourceColumnIndex` + a similar lookup.
 */
export const mapSourceRows = <TStored, TApp>(
  response: ESQLSearchResponse,
  fromStorage: (raw: TStored) => TApp
): TApp[] => {
  const sourceIdx = getSourceColumnIndex(response);
  if (sourceIdx === -1) return [];
  return response.values.map((row) => fromStorage(row[sourceIdx] as TStored));
};
