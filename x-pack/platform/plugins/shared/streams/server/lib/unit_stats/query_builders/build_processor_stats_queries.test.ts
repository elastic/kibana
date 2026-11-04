/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNIT_METRICS_STREAM } from '../constants';
import { buildProcessorSumsQuery } from './build_processor_stats_queries';

const window = { start: '2026-10-20T10:00:00.000Z', end: '2026-10-20T10:15:00.000Z' };
const params = { unitId: 'default', window, ids: ['uppercase-message'] };

const head = `SET unmapped_fields = "nullify"; FROM ${UNIT_METRICS_STREAM} | WHERE resource.attributes.unit.id == "default" AND @timestamp >= "${window.start}" AND @timestamp < "${window.end}" | WHERE scope.attributes.streams.step.id IN ("uppercase-message")`;

describe('buildProcessorSumsQuery', () => {
  it('divides the items in by the time since the first delta starts and the duration by the items in, per pipeline and route', () => {
    expect(buildProcessorSumsQuery(params).print('basic')).toBe(
      `${head} | EVAL delta = TO_DOUBLE(metrics.streams.step.items) | STATS sum_items_in = SUM(delta) WHERE attributes.direction == "in", duration_sum = SUM(metrics.streams.step.duration), covered_from = MIN(start_timestamp) BY step = scope.attributes.streams.step.id, pipeline = scope.attributes.streams.pipeline.id, route_index = scope.attributes.streams.route.index | EVAL window_seconds = DATE_DIFF("milliseconds", covered_from, "${window.end}") / 1000.0 | EVAL incoming_rate = sum_items_in / window_seconds, avg_duration_per_item = CASE(sum_items_in > 0, duration_sum / sum_items_in) | KEEP step, pipeline, route_index, incoming_rate, avg_duration_per_item | LIMIT 10000`
    );
  });

  // The collector ignores OTTL statement errors, so a failed record still counts as a success:
  // processor failures cannot be observed until
  // https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/52158 is fixed.
  it('does not query failures', () => {
    expect(buildProcessorSumsQuery(params).print('basic')).not.toContain('outcome');
  });

  it('adds the hash filter only when the request pins one', () => {
    const query = buildProcessorSumsQuery({ ...params, configHash: 'h1' }).print('basic');

    expect(query).toContain(
      '| WHERE resource.attributes.streams.config.hash == "h1" | WHERE scope.attributes.streams.step.id IN'
    );
    expect(buildProcessorSumsQuery(params).print('basic')).not.toContain('config.hash');
  });
});
