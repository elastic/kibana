/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNIT_METRICS_STREAM } from '../constants';
import {
  buildDestinationFailureCollectionsQuery,
  buildDestinationRateQuery,
  buildDestinationSumsQuery,
} from './build_destination_stats_queries';

const window = { start: '2026-10-20T10:00:00.000Z', end: '2026-10-20T10:15:00.000Z' };
const params = { unitId: 'default', window, ids: ['es-prod', 'es-dev'] };

const head = `SET unmapped_fields = "nullify"; FROM ${UNIT_METRICS_STREAM} | WHERE resource.attributes.unit.id == "default" AND @timestamp >= "${window.start}" AND @timestamp < "${window.end}" | WHERE scope.attributes.streams.destination.id IN ("es-prod", "es-dev")`;

describe('buildDestinationRateQuery', () => {
  it('divides the items, the failed items and the 401 and 403 items by the time since the first delta starts, and averages the latency', () => {
    expect(buildDestinationRateQuery(params).print('basic')).toBe(
      `${head} | EVAL delta = TO_DOUBLE(metrics.streams.destination.items) | STATS sum_items = SUM(delta) WHERE attributes.outcome IS NULL OR attributes.outcome != "failure_store", failed_items = SUM(delta) WHERE attributes.outcome != "success", authentication_items = SUM(delta) WHERE attributes.http.response.status_code == 401, authorization_items = SUM(delta) WHERE attributes.http.response.status_code == 403, avg_latency = AVG(metrics.streams.destination.duration), covered_from = MIN(start_timestamp) BY id = scope.attributes.streams.destination.id | EVAL window_seconds = DATE_DIFF("milliseconds", covered_from, "${window.end}") / 1000.0 | EVAL incoming_rate = sum_items / window_seconds, failed_rate = CASE(sum_items IS NOT NULL, COALESCE(failed_items, 0.0) / window_seconds), authentication_rate = CASE(sum_items IS NOT NULL, COALESCE(authentication_items, 0.0) / window_seconds), authorization_rate = CASE(sum_items IS NOT NULL, COALESCE(authorization_items, 0.0) / window_seconds) | KEEP id, incoming_rate, failed_rate, authentication_rate, authorization_rate, avg_latency`
    );
  });

  it('leaves failure store rows out of the items sum and keeps them in the failed sum', () => {
    const query = buildDestinationRateQuery(params).print('basic');

    expect(query).toContain(
      'sum_items = SUM(delta) WHERE attributes.outcome IS NULL OR attributes.outcome != "failure_store"'
    );
    expect(query).toContain('failed_items = SUM(delta) WHERE attributes.outcome != "success"');
  });

  it('adds the hash filter only when the request pins one', () => {
    const query = buildDestinationRateQuery({ ...params, configHash: 'h1' }).print('basic');

    expect(query).toContain(
      '| WHERE resource.attributes.streams.config.hash == "h1" | WHERE scope.attributes.streams.destination.id IN'
    );
    expect(buildDestinationRateQuery(params).print('basic')).not.toContain('config.hash');
  });
});

describe('buildDestinationFailureCollectionsQuery', () => {
  it('divides the 401 and 403 items of each collection by the time of the whole destination', () => {
    expect(buildDestinationFailureCollectionsQuery(params).print('basic')).toBe(
      `${head} | EVAL delta = TO_DOUBLE(metrics.streams.destination.items) | INLINE STATS covered_from = MIN(start_timestamp) BY scope.attributes.streams.destination.id | WHERE (attributes.http.response.status_code IN (401, 403)) AND attributes.db.collection.name IS NOT NULL | STATS authentication_items = SUM(delta) WHERE attributes.http.response.status_code == 401, authorization_items = SUM(delta) WHERE attributes.http.response.status_code == 403, covered_from = MIN(covered_from) BY id = scope.attributes.streams.destination.id, collection = attributes.db.collection.name | EVAL window_seconds = DATE_DIFF("milliseconds", covered_from, "${window.end}") / 1000.0 | EVAL authentication_rate = authentication_items / window_seconds, authorization_rate = authorization_items / window_seconds | KEEP id, collection, authentication_rate, authorization_rate`
    );
  });

  it('finds the start of the destination before it keeps only the rejected items', () => {
    const query = buildDestinationFailureCollectionsQuery(params).print('basic');

    expect(query.indexOf('INLINE STATS')).toBeGreaterThan(-1);
    expect(query.indexOf('INLINE STATS')).toBeLessThan(query.indexOf('status_code IN (401, 403)'));
  });

  it('keeps out the failures of a whole request, which have no collection', () => {
    const query = buildDestinationFailureCollectionsQuery(params).print('basic');

    expect(query).toContain('AND attributes.db.collection.name IS NOT NULL');
  });

  it('adds the hash filter only when the request pins one', () => {
    const query = buildDestinationFailureCollectionsQuery({ ...params, configHash: 'h1' });

    expect(query.print('basic')).toContain('resource.attributes.streams.config.hash == "h1"');
    expect(buildDestinationFailureCollectionsQuery(params).print('basic')).not.toContain(
      'config.hash'
    );
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
