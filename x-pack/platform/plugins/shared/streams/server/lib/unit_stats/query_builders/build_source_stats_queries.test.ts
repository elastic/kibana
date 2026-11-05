/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNIT_METRICS_STREAM } from '../constants';
import { buildSourceRateQuery } from './build_source_stats_queries';

const window = { start: '2026-10-20T10:00:00.000Z', end: '2026-10-20T10:15:00.000Z' };
const params = { unitId: 'default', window, ids: ['otlp-input', 'prw-input'] };

describe('buildSourceRateQuery', () => {
  it('divides the accepted items by the time since the first delta starts, over the items documents only', () => {
    expect(buildSourceRateQuery(params).print('basic')).toBe(
      `SET unmapped_fields = "nullify"; FROM ${UNIT_METRICS_STREAM} | WHERE resource.attributes.unit.id == "default" AND @timestamp >= "${window.start}" AND @timestamp < "${window.end}" | WHERE attributes.source.id IN ("otlp-input", "prw-input") | WHERE metrics.streams.source.items IS NOT NULL | EVAL delta = TO_DOUBLE(metrics.streams.source.items) | STATS accepted_items = SUM(delta) WHERE attributes.outcome == "success", covered_from = MIN(start_timestamp) BY id = attributes.source.id | EVAL window_seconds = DATE_DIFF("milliseconds", covered_from, "${window.end}") / 1000.0 | EVAL accepted_rate = COALESCE(accepted_items, 0.0) / window_seconds | KEEP id, accepted_rate`
    );
  });

  it('ignores a pinned config hash, because source metrics have none', () => {
    const pinned = { ...params, configHash: 'h1' };

    expect(buildSourceRateQuery(pinned).print('basic')).not.toContain('config.hash');
  });
});
