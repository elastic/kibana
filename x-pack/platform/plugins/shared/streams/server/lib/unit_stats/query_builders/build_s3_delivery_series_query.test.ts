/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNIT_METRICS_STREAM } from '../constants';
import {
  S3_AUTHENTICATION_ERROR_CODES,
  S3_AUTHORIZATION_ERROR_CODES,
} from '../s3_auth_failure_classes';
import { buildS3DeliverySeriesQuery } from './build_s3_delivery_series_query';

const window = { start: '2026-10-20T10:00:00.000Z', end: '2026-10-20T10:15:00.000Z' };
const params = { unitId: 'default', window, ids: ['s3-a', 's3-b'], bucketMs: 60_000 };

const head = `SET unmapped_fields = "nullify"; FROM ${UNIT_METRICS_STREAM} | WHERE resource.attributes.unit.id == "default" AND @timestamp >= "${window.start}" AND @timestamp < "${window.end}" | WHERE scope.attributes.streams.destination.id IN ("s3-a", "s3-b")`;

const codes = (list: readonly string[]) => list.map((code) => `"${code}"`).join(', ');

describe('buildS3DeliverySeriesQuery', () => {
  it('counts the attempted, failed, authentication and authorization upload attempts per destination and bucket', () => {
    expect(buildS3DeliverySeriesQuery(params).print('basic')).toBe(
      `${head} | WHERE metrics.streams.destination.duration IS NOT NULL | STATS total_items = COUNT(metrics.streams.destination.duration), failed_items = COUNT(metrics.streams.destination.duration) WHERE attributes.outcome == "failure", authentication_items = COUNT(metrics.streams.destination.duration) WHERE attributes.outcome == "failure" AND (attributes.error.type IN (${codes(
        S3_AUTHENTICATION_ERROR_CODES
      )})), authorization_items = COUNT(metrics.streams.destination.duration) WHERE attributes.outcome == "failure" AND (attributes.error.type IN (${codes(
        S3_AUTHORIZATION_ERROR_CODES
      )})) BY id = scope.attributes.streams.destination.id, bucket = BUCKET(@timestamp, 60000 ms) | SORT bucket | LIMIT 10000`
    );
  });

  it('counts the observations of the duration histogram, one for each upload attempt, not the items', () => {
    const query = buildS3DeliverySeriesQuery(params).print('basic');

    expect(query).toContain('COUNT(metrics.streams.destination.duration)');
    expect(query).not.toContain('metrics.streams.destination.items');
  });

  it('picks each class by the error codes of the lists that the class rates use, and only among the failures', () => {
    const query = buildS3DeliverySeriesQuery(params).print('basic');

    [...S3_AUTHENTICATION_ERROR_CODES, ...S3_AUTHORIZATION_ERROR_CODES].forEach((code) =>
      expect(query).toContain(`"${code}"`)
    );
    expect(query.match(/WHERE attributes.outcome == "failure" AND/g)).toHaveLength(2);
    // A code with no class is in no list, so it counts as a failure and as neither class.
    expect(query).not.toContain('"NoSuchBucket"');
    expect(query).not.toContain('"timeout"');
  });

  it('uses the bucket width that it is given', () => {
    expect(buildS3DeliverySeriesQuery({ ...params, bucketMs: 300_000 }).print('basic')).toContain(
      'BUCKET(@timestamp, 300000 ms)'
    );
  });

  it('adds the hash filter only when the request pins one', () => {
    const query = buildS3DeliverySeriesQuery({ ...params, configHash: 'h1' });

    expect(query.print('basic')).toContain('resource.attributes.streams.config.hash == "h1"');
    expect(buildS3DeliverySeriesQuery(params).print('basic')).not.toContain('config.hash');
  });
});
