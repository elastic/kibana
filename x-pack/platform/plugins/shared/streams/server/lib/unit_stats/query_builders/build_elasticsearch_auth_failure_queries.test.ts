/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNIT_METRICS_STREAM } from '../constants';
import {
  buildElasticsearchAuthFailureCollectionsQuery,
  buildElasticsearchAuthFailureRatesQuery,
} from './build_elasticsearch_auth_failure_queries';

const window = { start: '2026-10-20T10:00:00.000Z', end: '2026-10-20T10:15:00.000Z' };
const params = { unitId: 'default', window, ids: ['es-prod', 'es-dev'] };

const head = `SET unmapped_fields = "nullify"; FROM ${UNIT_METRICS_STREAM} | WHERE resource.attributes.unit.id == "default" AND @timestamp >= "${window.start}" AND @timestamp < "${window.end}" | WHERE scope.attributes.streams.destination.id IN ("es-prod", "es-dev")`;

describe('buildElasticsearchAuthFailureRatesQuery', () => {
  it('divides the 401 and the 403 items by the time since the first delta starts', () => {
    expect(buildElasticsearchAuthFailureRatesQuery(params).print('basic')).toBe(
      `${head} | EVAL delta = TO_DOUBLE(metrics.streams.destination.items) | STATS sum_items = SUM(delta), authentication_items = SUM(delta) WHERE attributes.http.response.status_code == 401, authorization_items = SUM(delta) WHERE attributes.http.response.status_code == 403, covered_from = MIN(start_timestamp) BY id = scope.attributes.streams.destination.id | EVAL window_seconds = DATE_DIFF("milliseconds", covered_from, "${window.end}") / 1000.0 | EVAL authentication_rate = CASE(sum_items IS NOT NULL, COALESCE(authentication_items, 0.0) / window_seconds), authorization_rate = CASE(sum_items IS NOT NULL, COALESCE(authorization_items, 0.0) / window_seconds) | KEEP id, authentication_rate, authorization_rate`
    );
  });

  it('filters on the status code, not on the outcome', () => {
    const query = buildElasticsearchAuthFailureRatesQuery(params).print('basic');

    expect(query).toContain('attributes.http.response.status_code == 401');
    expect(query).not.toContain('attributes.outcome');
  });

  it('adds the hash filter only when the request pins one', () => {
    const query = buildElasticsearchAuthFailureRatesQuery({ ...params, configHash: 'h1' });

    expect(query.print('basic')).toContain('resource.attributes.streams.config.hash == "h1"');
    expect(buildElasticsearchAuthFailureRatesQuery(params).print('basic')).not.toContain(
      'config.hash'
    );
  });
});

describe('buildElasticsearchAuthFailureCollectionsQuery', () => {
  it('divides the 401 and 403 items of each collection by the time of the whole destination', () => {
    expect(buildElasticsearchAuthFailureCollectionsQuery(params).print('basic')).toBe(
      `${head} | EVAL delta = TO_DOUBLE(metrics.streams.destination.items) | INLINE STATS covered_from = MIN(start_timestamp) BY scope.attributes.streams.destination.id | WHERE (attributes.http.response.status_code IN (401, 403)) AND attributes.db.collection.name IS NOT NULL | STATS authentication_items = SUM(delta) WHERE attributes.http.response.status_code == 401, authorization_items = SUM(delta) WHERE attributes.http.response.status_code == 403, covered_from = MIN(covered_from) BY id = scope.attributes.streams.destination.id, collection = attributes.db.collection.name | EVAL window_seconds = DATE_DIFF("milliseconds", covered_from, "${window.end}") / 1000.0 | EVAL authentication_rate = authentication_items / window_seconds, authorization_rate = authorization_items / window_seconds | KEEP id, collection, authentication_rate, authorization_rate`
    );
  });

  it('finds the start of the destination before it keeps only the rejected items', () => {
    const query = buildElasticsearchAuthFailureCollectionsQuery(params).print('basic');

    expect(query.indexOf('INLINE STATS')).toBeGreaterThan(-1);
    expect(query.indexOf('INLINE STATS')).toBeLessThan(query.indexOf('status_code IN (401, 403)'));
  });

  it('keeps out the failures of a whole request, which have no collection', () => {
    const query = buildElasticsearchAuthFailureCollectionsQuery(params).print('basic');

    expect(query).toContain('AND attributes.db.collection.name IS NOT NULL');
  });

  it('adds the hash filter only when the request pins one', () => {
    const query = buildElasticsearchAuthFailureCollectionsQuery({ ...params, configHash: 'h1' });

    expect(query.print('basic')).toContain('resource.attributes.streams.config.hash == "h1"');
    expect(buildElasticsearchAuthFailureCollectionsQuery(params).print('basic')).not.toContain(
      'config.hash'
    );
  });
});
