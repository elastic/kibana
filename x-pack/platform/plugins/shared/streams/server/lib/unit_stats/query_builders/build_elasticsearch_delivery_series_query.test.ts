/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNIT_METRICS_STREAM } from '../constants';
import { buildElasticsearchDeliverySeriesQuery } from './build_elasticsearch_delivery_series_query';

const window = { start: '2026-10-20T10:00:00.000Z', end: '2026-10-20T10:15:00.000Z' };
const params = { unitId: 'default', window, ids: ['es-prod', 'es-dev'], bucketMs: 60_000 };

const head = `SET unmapped_fields = "nullify"; FROM ${UNIT_METRICS_STREAM} | WHERE resource.attributes.unit.id == "default" AND @timestamp >= "${window.start}" AND @timestamp < "${window.end}" | WHERE scope.attributes.streams.destination.id IN ("es-prod", "es-dev")`;

describe('buildElasticsearchDeliverySeriesQuery', () => {
  it('sums the attempted, failed, 401 and 403 items per destination and bucket, with a plain FROM', () => {
    expect(buildElasticsearchDeliverySeriesQuery(params).print('basic')).toBe(
      `${head} | WHERE metrics.streams.destination.items IS NOT NULL | EVAL delta = TO_DOUBLE(metrics.streams.destination.items) | STATS total_items = SUM(delta) WHERE attributes.outcome IS NULL OR attributes.outcome != "failure_store", failed_items = SUM(delta) WHERE attributes.outcome != "success" AND (attributes.outcome != "failure_store" OR attributes.failure_store == "used"), authentication_items = SUM(delta) WHERE attributes.http.response.status_code == 401, authorization_items = SUM(delta) WHERE attributes.http.response.status_code == 403 BY id = scope.attributes.streams.destination.id, bucket = BUCKET(@timestamp, 60000 ms) | SORT bucket | LIMIT 10000`
    );
  });

  it('picks the two classes by status code, not by outcome, as the rates do', () => {
    const query = buildElasticsearchDeliverySeriesQuery(params).print('basic');

    expect(query).toContain(
      'authentication_items = SUM(delta) WHERE attributes.http.response.status_code == 401'
    );
    expect(query).toContain(
      'authorization_items = SUM(delta) WHERE attributes.http.response.status_code == 403'
    );
  });

  it('uses the bucket width that it is given', () => {
    expect(
      buildElasticsearchDeliverySeriesQuery({ ...params, bucketMs: 300_000 }).print('basic')
    ).toContain('BUCKET(@timestamp, 300000 ms)');
  });

  it('adds the hash filter only when the request pins one', () => {
    const query = buildElasticsearchDeliverySeriesQuery({ ...params, configHash: 'h1' });

    expect(query.print('basic')).toContain('resource.attributes.streams.config.hash == "h1"');
    expect(buildElasticsearchDeliverySeriesQuery(params).print('basic')).not.toContain(
      'config.hash'
    );
  });
});
