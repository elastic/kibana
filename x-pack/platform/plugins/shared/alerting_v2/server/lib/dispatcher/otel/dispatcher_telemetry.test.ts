/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { metrics } from '@opentelemetry/api';
import {
  ALERT_SCAN_TRUNCATED_METRIC,
  DispatcherTelemetry,
  OVERSIZED_ALERT_DATA_SKIPPED_METRIC,
} from './dispatcher_telemetry';

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
    expect(ALERT_SCAN_TRUNCATED_METRIC).toBe(
      'kibana.alerting_v2.dispatcher.alert_scan_truncated.count'
    );
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

  it('adds the number of skipped alerts to the oversized data counter', () => {
    const telemetry = new DispatcherTelemetry();
    const createCounter = jest.mocked(getMeter.mock.results[0].value.createCounter);
    expect(createCounter).toHaveBeenCalledWith(
      OVERSIZED_ALERT_DATA_SKIPPED_METRIC,
      expect.objectContaining({ unit: '1', valueType: expect.any(Number) })
    );
    expect(OVERSIZED_ALERT_DATA_SKIPPED_METRIC).toBe(
      'kibana.alerting_v2.dispatcher.oversized_alert_data_skipped.count'
    );
    const add = jest.mocked(createCounter.mock.results[1].value.add);
    add.mockClear();

    telemetry.recordOversizedAlertDataSkipped(3);

    expect(add).toHaveBeenCalledWith(3);
  });
});
