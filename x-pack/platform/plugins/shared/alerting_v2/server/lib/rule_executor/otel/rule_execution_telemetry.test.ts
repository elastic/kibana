/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { metrics } from '@opentelemetry/api';
import {
  QUERY_RESPONSE_SIZE_EXCEEDED_METRIC,
  ruleExecutionTelemetry,
} from './rule_execution_telemetry';

jest.mock('@opentelemetry/api', () => {
  const actual = jest.requireActual('@opentelemetry/api');
  const add = jest.fn();
  const createCounter = jest.fn(() => ({ add }));
  const getMeter = jest.fn(() => ({ createCounter }));
  return { ...actual, metrics: { ...actual.metrics, getMeter } };
});

const getMeter = jest.mocked(metrics.getMeter);
const createCounter = jest.mocked(getMeter.mock.results[0].value.createCounter);
const add = jest.mocked(createCounter.mock.results[0].value.add);

describe('ruleExecutionTelemetry', () => {
  beforeEach(() => {
    add.mockClear();
  });

  it('creates the counter once on the alerting v2 meter with a fully-qualified name', () => {
    expect(getMeter).toHaveBeenCalledTimes(1);
    expect(getMeter).toHaveBeenCalledWith('kibana.alerting_v2');
    expect(createCounter).toHaveBeenCalledTimes(1);
    expect(createCounter).toHaveBeenCalledWith(
      QUERY_RESPONSE_SIZE_EXCEEDED_METRIC,
      expect.objectContaining({ unit: '1', valueType: expect.any(Number) })
    );
  });

  it('increments by one with the query type and rule kind as attributes', () => {
    ruleExecutionTelemetry.recordQueryResponseSizeExceeded({
      queryType: 'breach',
      ruleKind: 'signal',
    });

    expect(add).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith(1, {
      'alerting.query.type': 'breach',
      'alerting.rule.kind': 'signal',
    });
  });
});
