/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compileMatchCountBreachQuery } from './match_count_query_compiler';
import { canCompileMatchMetric } from './can_compile_match_metric';
import {
  METRIC_SERIES_CLOSED_BUCKETS,
  METRIC_SERIES_EVERY,
  METRIC_SERIES_LIMIT,
  METRIC_SERIES_LOOKBACK,
} from './metric_series_contract';

describe('metric series contract', () => {
  it('derives EVERY / LOOKBACK / LIMIT from CLOSED_BUCKETS', () => {
    expect(METRIC_SERIES_CLOSED_BUCKETS).toBe(5);
    expect(METRIC_SERIES_EVERY).toBe('5m');
    expect(METRIC_SERIES_LOOKBACK).toBe('6m');
    expect(METRIC_SERIES_LIMIT).toBe(5);
  });
});

describe('canCompileMatchMetric', () => {
  it('accepts filter-only MATCH queries', () => {
    expect(canCompileMatchMetric('FROM logs-* | WHERE level == "error"')).toBe(true);
  });

  it('rejects STATS queries', () => {
    expect(
      canCompileMatchMetric(
        'FROM logs | STATS metric_value = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)'
      )
    ).toBe(false);
  });

  it('rejects empty queries', () => {
    expect(canCompileMatchMetric('   ')).toBe(false);
  });
});

describe('compileMatchCountBreachQuery', () => {
  it('compiles a MATCH KI into a closed-minute count series', () => {
    const compiled = compileMatchCountBreachQuery(
      'FROM logs-* METADATA _id, _source | WHERE level == "error"',
      '@timestamp'
    );

    expect(compiled).toContain('FROM logs-*');
    expect(compiled).not.toContain('METADATA');
    expect(compiled).not.toContain('?_tend');
    expect(compiled).toContain('STATS metric_value = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)');
    expect(compiled).toContain('WHERE bucket < DATE_TRUNC(1 minute, NOW())');
    expect(compiled).toContain('KEEP bucket, metric_value');
    expect(compiled).toContain('SORT bucket DESC');
    expect(compiled).toContain(`LIMIT ${METRIC_SERIES_LIMIT}`);
    expect(compiled).not.toContain('TO_LONG');
    expect(compiled).not.toContain('DATE_FORMAT');
    expect(compiled).not.toContain('SORT bucket ASC');
  });

  it('fails closed for STATS queries', () => {
    expect(() =>
      compileMatchCountBreachQuery(
        'FROM logs | STATS c = COUNT(*) BY bucket = BUCKET(@timestamp, 1 minute)',
        '@timestamp'
      )
    ).toThrow(/filter-only/);
  });
});
