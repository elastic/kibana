/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import { esql } from '@elastic/esql';
import type { ESQLSearchResponse } from '@kbn/es-types';

/**
 * Shape of a single pass-1 row after `CATEGORIZE` + `TOP(_index:_id, 1)`. The
 * categorization step keeps only category metadata plus one representative
 * composite key per pattern — never the full document, because per-field ES|QL
 * aggregations cannot return a coherent `_source` from a grouped row.
 */
export interface Pass1Row {
  docKey: string;
  count: number;
  pattern: string;
}

/**
 * Converts a possibly-dotted ECS field path (e.g. `body.text`) into the
 * ES|QL Composer column-path shape (`['body', 'text']`), or returns the literal
 * field name when there is no dot. Required because `esql.col(...)` accepts a
 * column-segment array for nested paths.
 */
export function columnPath(field: string): string | string[] {
  return field.includes('.') ? field.split('.') : field;
}

/**
 * Builds the pass-1 ES|QL categorization query: emit a composite `_index:_id`
 * key per document, optionally apply a KQL filter, optionally SAMPLE for
 * cost-bounded categorization on large populations, then `STATS … BY pattern =
 * CATEGORIZE(field)` and return the top `limit` patterns by count along with
 * one representative key per pattern.
 *
 * Both callers — diverse sampling and SigEvents log-patterns — use the same
 * shape; only `kql` and the `limit` value differ. `TOP(doc_key, 1, "desc")`
 * gives "any stable representative" (not "latest"); pass 2 fetches the
 * `_source` for those keys via `buildPass2Query`.
 */
export function buildPass1Query({
  indices,
  field,
  limit,
  samplingProbability,
  kql,
}: {
  indices: string[];
  field: string;
  limit: number;
  samplingProbability: number;
  kql?: string;
}): string {
  let query = esql.from(indices, ['_index', '_id']).pipe`EVAL doc_key = CONCAT(${esql.col(
    '_index'
  )}, ":", ${esql.col('_id')})`;

  if (kql) {
    query = query.where`KQL(${esql.str(kql)})`;
  }
  if (samplingProbability < 1) {
    query = query.pipe`SAMPLE ${esql.num(samplingProbability)}`;
  }

  return query.pipe`STATS representative_key = TOP(doc_key, 1, "desc"), count = COUNT(*) BY pattern = CATEGORIZE(${esql.col(
    columnPath(field)
  )})`
    .sort([['count'], 'DESC', ''])
    .limit(limit)
    .print('basic');
}

/**
 * Fetches `_source` for the exact composite (`_index:_id`) keys chosen by pass
 * 1. Used by both the diverse-sampling and SigEvents log-patterns helpers.
 *
 * Why not reuse `getSampleDocumentsEsql` for this fetch: that helper discards
 * `_index` when parsing hits (it hardcodes `_index: ''`), so a multi-index
 * `_id` collision becomes indistinguishable. Streams queries routinely span
 * backing indices, so the composite key is load-bearing.
 */
export function buildPass2Query(indices: string[], docKeys: string[]): string {
  const query = esql.from(indices, ['_index', '_id', '_source'])
    .pipe`EVAL doc_key = CONCAT(${esql.col('_index')}, ":", ${esql.col('_id')})`;

  return query.pipe`WHERE doc_key IN (${docKeys.map((docKey) => esql.str(docKey))})`
    .pipe`KEEP _index, _id, _source`
    .limit(docKeys.length)
    .print('basic');
}

/**
 * Parses a pass-1 ES|QL response into rows tagged with the representative
 * composite key, pattern, and count. Tolerates a known ES response-shape
 * variance: `TOP(..., 1)` is normally a scalar but some snapshots wrap it in a
 * single-item array.
 */
export function parsePass1Rows(response: ESQLSearchResponse): Pass1Row[] {
  const keyIndex = response.columns.findIndex((column) => column.name === 'representative_key');
  const countIndex = response.columns.findIndex((column) => column.name === 'count');
  const patternIndex = response.columns.findIndex((column) => column.name === 'pattern');

  if (keyIndex === -1 || countIndex === -1 || patternIndex === -1) {
    return [];
  }

  return response.values.flatMap((row) => {
    const rawKey = row[keyIndex];
    // ES|QL currently returns TOP(..., 1) as a scalar, but accepting a single-item
    // array makes this parser tolerant of response-shape differences across ES
    // snapshots without changing the query contract.
    const docKey = Array.isArray(rawKey) ? rawKey[0] : rawKey;
    const count = row[countIndex];
    const pattern = row[patternIndex];

    if (typeof docKey !== 'string' || typeof count !== 'number' || typeof pattern !== 'string') {
      return [];
    }

    return [{ docKey, count, pattern }];
  });
}

/**
 * Parses a pass-2 ES|QL response into Elasticsearch `SearchHit` shapes. Reads
 * `_index`, `_id`, and `_source` columns by name (column position can drift
 * across ES snapshots when `drop_null_columns` is in play).
 */
export function parsePass2Hits(
  response: ESQLSearchResponse
): Array<SearchHit<Record<string, unknown>>> {
  const indexIndex = response.columns.findIndex((column) => column.name === '_index');
  const idIndex = response.columns.findIndex((column) => column.name === '_id');
  const sourceIndex = response.columns.findIndex((column) => column.name === '_source');

  if (indexIndex === -1 || idIndex === -1 || sourceIndex === -1) {
    return [];
  }

  return response.values.flatMap((row) => {
    const index = row[indexIndex];
    const id = row[idIndex];

    if (typeof index !== 'string' || typeof id !== 'string') {
      return [];
    }

    return [
      {
        _index: index,
        _id: id,
        _source: (row[sourceIndex] as Record<string, unknown> | null) ?? {},
      },
    ];
  });
}
