/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEsqlHistogramQuery,
  ESQL_HISTOGRAM_BUCKET_COUNT,
  ESQL_HISTOGRAM_COUNT_COLUMN,
  ESQL_HISTOGRAM_TIME_COLUMN,
} from './esql_histogram_query';

describe('buildEsqlHistogramQuery', () => {
  it('appends a STATS COUNT(*) BY BUCKET(...) clause using the emitted time field', () => {
    const result = buildEsqlHistogramQuery({
      query: 'FROM logs-*',
      timeField: '@timestamp',
      start: '2026-09-01T00:00:00.000Z',
      end: '2026-09-02T00:00:00.000Z',
    });

    expect(result).toBe(
      'FROM logs-* | STATS esql_histogram_count = COUNT(*) BY ' +
        'esql_histogram_time = BUCKET(@timestamp, 50, "2026-09-01T00:00:00.000Z", "2026-09-02T00:00:00.000Z") ' +
        '| SORT esql_histogram_time ASC'
    );
  });

  it('defaults to 50 buckets, matching the LEAD DECISION', () => {
    expect(ESQL_HISTOGRAM_BUCKET_COUNT).toBe(50);
  });

  it('honors a custom bucket count', () => {
    const result = buildEsqlHistogramQuery({
      query: 'FROM logs-*',
      timeField: 'bucket',
      start: 'now-15m',
      end: 'now',
      buckets: 20,
    });

    expect(result).toContain('BUCKET(bucket, 20, "now-15m", "now")');
  });

  it('strips a trailing pipe from the base query before appending', () => {
    const result = buildEsqlHistogramQuery({
      query: 'FROM logs-* |',
      timeField: '@timestamp',
      start: 'a',
      end: 'b',
    });

    expect(result.startsWith('FROM logs-* | STATS')).toBe(true);
  });

  it('preserves existing pipeline stages (e.g. STATS BY) ahead of the histogram clause', () => {
    const result = buildEsqlHistogramQuery({
      query: 'FROM logs-* | STATS doc_count = COUNT(*) BY bucket = BUCKET(@timestamp, 1 hour)',
      timeField: 'bucket',
      start: 'now-15m',
      end: 'now',
    });

    expect(result).toContain(
      'STATS doc_count = COUNT(*) BY bucket = BUCKET(@timestamp, 1 hour) | STATS ' +
        `${ESQL_HISTOGRAM_COUNT_COLUMN}`
    );
  });

  it('sorts by the histogram time column ascending', () => {
    const result = buildEsqlHistogramQuery({
      query: 'FROM logs-*',
      timeField: '@timestamp',
      start: 'a',
      end: 'b',
    });

    expect(result.endsWith(`SORT ${ESQL_HISTOGRAM_TIME_COLUMN} ASC`)).toBe(true);
  });
});
