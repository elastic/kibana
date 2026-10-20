/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNIT_STATS_STREAM } from '../constants';
import { buildProcessorRateQuery, buildProcessorSumsQuery } from './build_processor_stats_queries';

const window = { start: '2026-10-20T10:00:00.000Z', end: '2026-10-20T10:15:00.000Z' };
const params = { unitId: 'default', window, ids: ['uppercase-message'] };

const head = (source: 'FROM' | 'TS') =>
  `${source} ${UNIT_STATS_STREAM} | WHERE resource.attributes.unit.id == "default" AND @timestamp >= "${window.start}" AND @timestamp < "${window.end}" | WHERE attributes.streams.step.id IN ("uppercase-message")`;

describe('buildProcessorRateQuery', () => {
  it('reads the rate of items coming in per processor from the time series', () => {
    expect(buildProcessorRateQuery(params).print('basic')).toBe(
      `${head(
        'TS'
      )} | WHERE attributes.direction == "in" | STATS rate = SUM(RATE(metrics.streams.step.items)) BY step = attributes.streams.step.id`
    );
  });

  // The collector ignores OTTL statement errors, so a failed record still counts as a success:
  // processor failures cannot be observed until
  // https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/52158 is fixed.
  it('does not query failures', () => {
    expect(buildProcessorRateQuery(params).print('basic')).not.toContain('outcome');
  });

  it('adds the hash filter only when the request pins one', () => {
    const query = buildProcessorRateQuery({ ...params, configHash: 'h1' }).print('basic');

    expect(query).toContain(
      '| WHERE resource.attributes.streams.config.hash == "h1" | WHERE attributes.streams.step.id IN'
    );
    expect(buildProcessorRateQuery(params).print('basic')).not.toContain('config.hash');
  });
});

describe('buildProcessorSumsQuery', () => {
  it('sums the items in and divides the duration by them, with a plain FROM', () => {
    expect(buildProcessorSumsQuery(params).print('basic')).toBe(
      `${head(
        'FROM'
      )} | EVAL delta = TO_DOUBLE(metrics.streams.step.items) | STATS items_in = SUM(delta) WHERE attributes.direction == "in", duration_sum = SUM(metrics.streams.step.duration) BY step = attributes.streams.step.id | EVAL duration_per_item = CASE(items_in > 0, duration_sum / items_in)`
    );
  });

  it('adds the hash filter only when the request pins one', () => {
    const query = buildProcessorSumsQuery({ ...params, configHash: 'h1' });

    expect(query.print('basic')).toContain('resource.attributes.streams.config.hash == "h1"');
  });
});
