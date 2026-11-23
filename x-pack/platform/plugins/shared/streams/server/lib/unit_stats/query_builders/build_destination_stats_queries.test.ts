/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { UNIT_METRICS_STREAM } from '../constants';
import {
  buildDestinationRateQuery,
  buildDestinationSumsQuery,
  countsFailureOnce,
  countsItemOnce,
} from './build_destination_stats_queries';

const window = { start: '2026-10-20T10:00:00.000Z', end: '2026-10-20T10:15:00.000Z' };
const params = { unitId: 'default', window, ids: ['es-prod', 'es-dev'] };

const head = `SET unmapped_fields = "nullify"; FROM ${UNIT_METRICS_STREAM} | WHERE resource.attributes.unit.id == "default" AND @timestamp >= "${window.start}" AND @timestamp < "${window.end}" | WHERE scope.attributes.streams.destination.id IN ("es-prod", "es-dev")`;

describe('the clauses that count an item once', () => {
  const printed = (clause: ReturnType<typeof countsItemOnce>) =>
    esql.from('metrics').pipe`WHERE ${clause}`.print('basic');

  it('leaves out every failure store row, and keeps a row with no outcome', () => {
    expect(printed(countsItemOnce())).toBe(
      'FROM metrics | WHERE attributes.outcome IS NULL OR attributes.outcome != "failure_store"'
    );
  });

  it('counts a failed outcome, and a failure store row only when its document used the failure store', () => {
    expect(printed(countsFailureOnce())).toBe(
      'FROM metrics | WHERE attributes.outcome != "success" AND (attributes.outcome != "failure_store" OR attributes.failure_store == "used")'
    );
  });
});

describe('buildDestinationRateQuery', () => {
  it('divides the items and the failed items by the time since the first delta starts, and averages the latency', () => {
    expect(buildDestinationRateQuery(params).print('basic')).toBe(
      `${head} | EVAL delta = TO_DOUBLE(metrics.streams.destination.items) | STATS sum_items = SUM(delta) WHERE attributes.outcome IS NULL OR attributes.outcome != "failure_store", failed_items = SUM(delta) WHERE attributes.outcome != "success" AND (attributes.outcome != "failure_store" OR attributes.failure_store == "used"), avg_latency = AVG(metrics.streams.destination.duration), covered_from = MIN(start_timestamp) BY id = scope.attributes.streams.destination.id | EVAL window_seconds = DATE_DIFF("milliseconds", covered_from, "${window.end}") / 1000.0 | EVAL incoming_rate = sum_items / window_seconds, failed_rate = CASE(sum_items IS NOT NULL, COALESCE(failed_items, 0.0) / window_seconds) | KEEP id, incoming_rate, failed_rate, avg_latency`
    );
  });

  it('leaves failure store rows out of the items sum, and counts a failure once in the failed sum', () => {
    const query = buildDestinationRateQuery(params).print('basic');

    expect(query).toContain(
      'sum_items = SUM(delta) WHERE attributes.outcome IS NULL OR attributes.outcome != "failure_store"'
    );
    expect(query).toContain(
      'failed_items = SUM(delta) WHERE attributes.outcome != "success" AND (attributes.outcome != "failure_store" OR attributes.failure_store == "used")'
    );
  });

  it('adds the hash filter only when the request pins one', () => {
    const query = buildDestinationRateQuery({ ...params, configHash: 'h1' }).print('basic');

    expect(query).toContain(
      '| WHERE resource.attributes.streams.config.hash == "h1" | WHERE scope.attributes.streams.destination.id IN'
    );
    expect(buildDestinationRateQuery(params).print('basic')).not.toContain('config.hash');
  });
});

describe('buildDestinationSumsQuery', () => {
  it('sums the items per destination and bucket, with a plain FROM', () => {
    expect(buildDestinationSumsQuery({ ...params, bucketMs: 60_000 }).print('basic')).toBe(
      `${head} | WHERE metrics.streams.destination.items IS NOT NULL | WHERE attributes.outcome IS NULL OR attributes.outcome != "failure_store" | EVAL delta = TO_DOUBLE(metrics.streams.destination.items) | STATS sum_items = SUM(delta) BY id = scope.attributes.streams.destination.id, bucket = BUCKET(@timestamp, 60000 ms) | SORT bucket | LIMIT 10000`
    );
  });

  it('adds the hash filter only when the request pins one', () => {
    const query = buildDestinationSumsQuery({ ...params, bucketMs: 60_000, configHash: 'h1' });

    expect(query.print('basic')).toContain('resource.attributes.streams.config.hash == "h1"');
  });
});
