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

/**
 * Top failure reasons: count of failure-store documents grouped by `error.type`,
 * sorted descending, capped at `limit` rows.
 */
export function buildTopFailureReasonsEsql(streamName: string, limit = 5): string {
  // Plain string query — the backtick-quoted `error.type` field and LIMIT clause
  // are not easily expressed via the typed builder.
  return `FROM ${streamName}::failures | STATS count = COUNT(*) BY error_type = \`error.type\` | SORT count DESC | LIMIT ${limit}`;
}

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * Returns a human-meaningful histogram bucket interval in milliseconds.
 *
 * Uses fixed breakpoints so chart buckets align to intuitive time units:
 *   < 15 min   → automatic (rangeMs / numDataPoints)
 *   15 min–1 h → 1 min
 *   1 h–6 h    → 5 min
 *   6 h–24 h   → 15 min
 *   24 h–3 d   → 1 h
 *   3 d–10 d   → 6 h
 *   > 10 d     → 1 d
 */
export function getMeaningfulBucketMs(rangeMs: number, numDataPoints: number): number {
  if (rangeMs < 15 * MINUTE_MS) return Math.floor(rangeMs / numDataPoints);
  if (rangeMs <= HOUR_MS) return MINUTE_MS;
  if (rangeMs <= 6 * HOUR_MS) return 5 * MINUTE_MS;
  if (rangeMs <= DAY_MS) return 15 * MINUTE_MS;
  if (rangeMs <= 3 * DAY_MS) return HOUR_MS;
  if (rangeMs <= 10 * DAY_MS) return 6 * HOUR_MS;
  return DAY_MS;
}

/** Ingest histogram: doc_count by @timestamp bucket (`intervalMs` snapped to a meaningful interval). */
export function buildStreamIngestHistogramEsql(source: string, intervalMs: number): string {
  return esql.from(source)
    .pipe`STATS doc_count = COUNT(*) BY @timestamp = BUCKET(@timestamp, ${intervalMs} ms)`.print(
    'basic'
  );
}
