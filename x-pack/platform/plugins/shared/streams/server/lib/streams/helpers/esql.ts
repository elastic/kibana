/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlQueryRequest } from '@elastic/elasticsearch/lib/api/types';
import { esql, type ComposerQuery } from '@elastic/esql';
import type { ESQLSearchResponse } from '@kbn/es-types';

/** Composer column helper that splits dotted names into the array shorthand. */
export const col = (field: string) => esql.col(field.includes('.') ? field.split('.') : field);

/** Index of the `_source` column, or `-1` when absent. */
export const getSourceColumnIndex = (response: ESQLSearchResponse): number =>
  response.columns.findIndex((c) => c.name === '_source');

/** Bridges `ComposerQuery.toRequest()` to `EsqlQueryRequest` — strips the loose `filter` and casts through `unknown` for named params (typed as positional in the ES client). */
export const toEsqlRequest = (query: ComposerQuery): EsqlQueryRequest => {
  const { filter: _composerFilter, ...rest } = query.toRequest();
  return rest as unknown as EsqlQueryRequest;
};

/** Maps each row's `_source` column through `fromStorage`. Returns `[]` if the column is absent. */
export const mapSourceRows = <TStored, TApp>(
  response: ESQLSearchResponse,
  fromStorage: (raw: TStored) => TApp
): TApp[] => {
  const sourceIdx = getSourceColumnIndex(response);
  if (sourceIdx === -1) return [];
  return response.values.map((row) => fromStorage(row[sourceIdx] as TStored));
};
