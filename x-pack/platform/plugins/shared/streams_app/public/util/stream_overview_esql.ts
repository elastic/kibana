/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';

/** Total document count in the active time range (`source` may be a stream, view, or comma-separated list). */
export function buildDataQualityTotalDocCountEsql(source: string): string {
  return esql.from(source).pipe`STATS doc_count = COUNT(*)`.print();
}

/** Degraded-doc count: rows with non-null `_ignored` in the time range. */
export function buildDataQualityDegradedDocCountEsql(source: string): string {
  return esql.from([source], ['_ignored']).pipe`WHERE _ignored IS NOT NULL`
    .pipe`STATS degraded_doc_count = COUNT(*)`.print();
}

/** Distinct ignored-field values count in the time range. */
export function buildDataQualityIgnoredFieldsCountEsql(source: string): string {
  return esql.from([source], ['_ignored']).pipe`WHERE _ignored IS NOT NULL`
    .pipe`STATS ignored_fields_count = COUNT_DISTINCT(_ignored)`.print('basic');
}

/** Ingest histogram: doc_count by @timestamp bucket (`minIntervalMs` from time range / bucket count). */
export function buildStreamIngestHistogramEsql(source: string, minIntervalMs: number): string {
  return esql.from(source)
    .pipe`STATS doc_count = COUNT(*) BY @timestamp = BUCKET(@timestamp, ${minIntervalMs} ms)`.print(
    'basic'
  );
}
