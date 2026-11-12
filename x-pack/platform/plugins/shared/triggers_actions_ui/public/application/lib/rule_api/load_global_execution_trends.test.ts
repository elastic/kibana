/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { loadGlobalExecutionTrends } from './load_global_execution_trends';

const http = httpServiceMock.createStartContract();

describe('loadGlobalExecutionTrends', () => {
  beforeEach(() => jest.resetAllMocks());

  it('calls the trends API and rewrites the response', async () => {
    http.get.mockResolvedValueOnce({
      interval: '5m',
      buckets: [
        {
          timestamp: '2024-01-01T00:00:00.000Z',
          total: 2,
          success: 1,
          failure: 1,
          warning: 0,
          unknown: 0,
          avg_duration_ms: 15,
        },
      ],
      top_failing_rules: [
        { id: 'a', name: 'Rule A', failures: 1, last_failure: '2024-01-01T00:00:00.000Z' },
      ],
      slowest_rules: [{ id: 'b', name: 'Rule B', executions: 2, avg_duration_ms: 40 }],
    });

    const result = await loadGlobalExecutionTrends({
      http,
      dateStart: '2024-01-01T00:00:00.000Z',
      dateEnd: '2024-01-02T00:00:00.000Z',
      ruleTypeIds: ['foo'],
      namespaces: ['default', 'other'],
    });

    expect(http.get).toHaveBeenCalledWith('/internal/alerting/_global_execution_trends', {
      query: {
        filter: 'kibana.alert.rule.rule_type_id:(foo)',
        date_start: '2024-01-01T00:00:00.000Z',
        date_end: '2024-01-02T00:00:00.000Z',
        namespaces: '["default","other"]',
      },
    });
    expect(result).toEqual({
      interval: '5m',
      buckets: [
        {
          timestamp: '2024-01-01T00:00:00.000Z',
          total: 2,
          success: 1,
          failure: 1,
          warning: 0,
          unknown: 0,
          avgDurationMs: 15,
        },
      ],
      topFailingRules: [
        { id: 'a', name: 'Rule A', failures: 1, lastFailure: '2024-01-01T00:00:00.000Z' },
      ],
      slowestRules: [{ id: 'b', name: 'Rule B', executions: 2, avgDurationMs: 40 }],
    });
  });

  it('resolves datemath expressions to ISO dates and omits empty params', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-02T00:00:00.000Z'));
    http.get.mockResolvedValueOnce({
      interval: '1h',
      buckets: [],
      top_failing_rules: [],
      slowest_rules: [],
    });

    await loadGlobalExecutionTrends({ http, dateStart: 'now-24h', dateEnd: 'now' });

    expect(http.get).toHaveBeenCalledWith('/internal/alerting/_global_execution_trends', {
      query: {
        filter: undefined,
        date_start: '2024-01-01T00:00:00.000Z',
        date_end: '2024-01-02T00:00:00.000Z',
        namespaces: undefined,
      },
    });
    jest.useRealTimers();
  });
});
