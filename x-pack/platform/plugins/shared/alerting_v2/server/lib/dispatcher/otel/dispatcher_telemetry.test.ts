/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { metrics } from '@opentelemetry/api';
import { ALERT_SCAN_TRUNCATED_METRIC, DispatcherTelemetry } from './dispatcher_telemetry';

jest.mock('@opentelemetry/api', () => {
  const actual = jest.requireActual('@opentelemetry/api');
  const add = jest.fn();
  const createCounter = jest.fn(() => ({ add }));
  const getMeter = jest.fn(() => ({ createCounter }));
  return { ...actual, metrics: { ...actual.metrics, getMeter } };
});

const getMeter = jest.mocked(metrics.getMeter);

describe('DispatcherTelemetry', () => {
  beforeEach(() => {
    getMeter.mockClear();
  });

  it('creates the counter on the alerting v2 meter with a fully-qualified name', () => {
    new DispatcherTelemetry();

    expect(getMeter).toHaveBeenCalledWith('kibana.alerting_v2');
    const createCounter = jest.mocked(getMeter.mock.results[0].value.createCounter);
    expect(createCounter).toHaveBeenCalledWith(
      ALERT_SCAN_TRUNCATED_METRIC,
      expect.objectContaining({ unit: '1', valueType: expect.any(Number) })
    );
  });

  it('increments by one without attributes', () => {
    const telemetry = new DispatcherTelemetry();
    const createCounter = jest.mocked(getMeter.mock.results[0].value.createCounter);
    const add = jest.mocked(createCounter.mock.results[0].value.add);
    add.mockClear();

    telemetry.recordAlertScanTruncated();

    expect(add).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith(1);
  });
});
