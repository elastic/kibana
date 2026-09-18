/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CRITICAL_SEVERITY_THRESHOLD } from '@kbn/significant-events-schema';
import { CLAIMS_SEED } from '../scenarios/claims';
import { buildMetricSeries } from './seed_alerts';

describe('significant events seed alert series', () => {
  it('keeps a complete zero-valued baseline before query-derived incident counts', () => {
    const start = Date.parse('2026-08-27T10:00:00.000Z');
    const end = Date.parse('2026-08-27T10:39:00.000Z');
    const rows = [
      { '@timestamp': '2026-08-27T10:30:05.000Z' },
      { '@timestamp': '2026-08-27T10:30:45.000Z' },
      { '@timestamp': '2026-08-27T10:39:15.000Z' },
    ];

    const points = buildMetricSeries(rows, start, end);

    expect(points).toHaveLength(40);
    expect(points.slice(0, 30).every(({ metricValue }) => metricValue === 0)).toBe(true);
    expect(points[30].metricValue).toBe(2);
    expect(points[39].metricValue).toBe(1);
  });

  it('uses the critical detector profile for the primary incident query', () => {
    const [primaryQuery] = CLAIMS_SEED.fraud_check_redis_herring.queries;

    expect(primaryQuery.severityScore).toBeGreaterThanOrEqual(CRITICAL_SEVERITY_THRESHOLD);
  });
});
