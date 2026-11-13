/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UNIT_METRICS_STREAM } from '../constants';
import { buildS3FailedUploadRatesQuery } from './build_s3_auth_failure_queries';

const window = { start: '2026-10-20T10:00:00.000Z', end: '2026-10-20T10:15:00.000Z' };
const params = { unitId: 'default', window, ids: ['s3-a', 's3-b'] };

const head = `SET unmapped_fields = "nullify"; FROM ${UNIT_METRICS_STREAM} | WHERE resource.attributes.unit.id == "default" AND @timestamp >= "${window.start}" AND @timestamp < "${window.end}" | WHERE scope.attributes.streams.destination.id IN ("s3-a", "s3-b")`;

describe('buildS3FailedUploadRatesQuery', () => {
  it('divides the failed upload attempts of each error code by the time of the whole destination', () => {
    expect(buildS3FailedUploadRatesQuery(params).print('basic')).toBe(
      `${head} | WHERE metrics.streams.destination.duration IS NOT NULL | INLINE STATS covered_from = MIN(start_timestamp) BY scope.attributes.streams.destination.id | STATS failed = COUNT(metrics.streams.destination.duration) WHERE attributes.outcome == "failure", covered_from = MIN(covered_from) BY id = scope.attributes.streams.destination.id, reason = attributes.error.type | EVAL window_seconds = DATE_DIFF("milliseconds", covered_from, "${window.end}") / 1000.0 | EVAL failed_rate = failed / window_seconds | KEEP id, reason, failed_rate | LIMIT 10000`
    );
  });

  it('counts the observations of the duration histogram, one for each upload attempt', () => {
    const query = buildS3FailedUploadRatesQuery(params).print('basic');

    expect(query).toContain('COUNT(metrics.streams.destination.duration)');
  });

  it('reads the failures and their reason from the duration metric, not from the items', () => {
    const query = buildS3FailedUploadRatesQuery(params).print('basic');

    expect(query).toContain('attributes.outcome == "failure"');
    expect(query).toContain('reason = attributes.error.type');
    expect(query).not.toContain('metrics.streams.destination.items');
  });

  it('finds the start of the destination before it counts the failures', () => {
    const query = buildS3FailedUploadRatesQuery(params).print('basic');

    expect(query.indexOf('INLINE STATS')).toBeGreaterThan(-1);
    expect(query.indexOf('INLINE STATS')).toBeLessThan(query.indexOf('| STATS failed'));
  });

  it('adds the hash filter only when the request pins one', () => {
    const query = buildS3FailedUploadRatesQuery({ ...params, configHash: 'h1' });

    expect(query.print('basic')).toContain('resource.attributes.streams.config.hash == "h1"');
    expect(buildS3FailedUploadRatesQuery(params).print('basic')).not.toContain('config.hash');
  });
});
