/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { rulesClientMock } from '../rules_client.mock';
import { getGlobalExecutionTrendsRoute } from './get_global_execution_trends';

const rulesClient = rulesClientMock.create();
jest.mock('../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getGlobalExecutionTrendsRoute', () => {
  const dateStart = new Date().toISOString();
  const dateEnd = new Date(Date.now() + 60 * 1000).toISOString();
  const mockedTrends = {
    interval: '1m',
    buckets: [
      {
        timestamp: dateStart,
        total: 3,
        success: 1,
        failure: 1,
        warning: 1,
        unknown: 0,
        avgDurationMs: 12,
      },
    ],
    topFailingRules: [{ id: 'rule-1', name: 'Rule one', failures: 1, lastFailure: dateStart }],
    slowestRules: [{ id: 'rule-2', name: 'Rule two', executions: 2, avgDurationMs: 40 }],
  };

  it('gets global execution trends', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getGlobalExecutionTrendsRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/_global_execution_trends"`);

    rulesClient.getGlobalExecutionTrendsWithAuth.mockResolvedValue(mockedTrends);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          date_start: dateStart,
          date_end: dateEnd,
          filter: 'kibana.alert.rule.rule_type_id: foo',
          namespaces: ['default', 'space-1'],
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(rulesClient.getGlobalExecutionTrendsWithAuth).toHaveBeenCalledTimes(1);
    expect(rulesClient.getGlobalExecutionTrendsWithAuth.mock.calls[0]).toEqual([
      {
        dateStart,
        dateEnd,
        filter: 'kibana.alert.rule.rule_type_id: foo',
        namespaces: [undefined, 'space-1'],
      },
    ]);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        interval: '1m',
        buckets: [
          {
            timestamp: dateStart,
            total: 3,
            success: 1,
            failure: 1,
            warning: 1,
            unknown: 0,
            avg_duration_ms: 12,
          },
        ],
        top_failing_rules: [
          { id: 'rule-1', name: 'Rule one', failures: 1, last_failure: dateStart },
        ],
        slowest_rules: [{ id: 'rule-2', name: 'Rule two', executions: 2, avg_duration_ms: 40 }],
      },
    });
  });
});
