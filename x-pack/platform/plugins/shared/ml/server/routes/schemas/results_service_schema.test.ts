/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlMetricDataSchema } from './results_service_schema';

const HOUR = 60 * 60 * 1000;

const validBody = {
  jobId: 'esql-job',
  entityFields: [],
  metricFunction: 'avg',
  metricFieldName: 'bytes',
  earliestMs: 0,
  latestMs: 24 * HOUR,
  intervalMs: HOUR,
};

describe('getEsqlMetricDataSchema', () => {
  test('accepts a valid time range', () => {
    expect(() => getEsqlMetricDataSchema.validate(validBody)).not.toThrow();
  });

  test('rejects latestMs earlier than earliestMs', () => {
    expect(() =>
      getEsqlMetricDataSchema.validate({ ...validBody, earliestMs: 2 * HOUR, latestMs: HOUR })
    ).toThrow('latestMs must not be earlier than earliestMs');
  });

  test('rejects a time range with too many intervals', () => {
    expect(() =>
      getEsqlMetricDataSchema.validate({ ...validBody, latestMs: 1e15, intervalMs: 1 })
    ).toThrow('The time range must not contain more than 10000 intervals');
  });
});
