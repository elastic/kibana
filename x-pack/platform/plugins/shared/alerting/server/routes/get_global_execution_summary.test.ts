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
import { getGlobalExecutionSummaryRoute } from './get_global_execution_summary';

const rulesClient = rulesClientMock.create();
jest.mock('../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getGlobalExecutionSummaryRoute', () => {
  const dateStart = new Date().toISOString();
  const dateEnd = new Date(Date.now() + 60 * 1000).toISOString();
  const mockedSummary = {
    executions: {
      total: 18,
      success: 18,
    },
    latestExecutionSummary: {
      success: 2,
      failure: 0,
      warning: 0,
    },
  };
  it('gets global execution summary', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getGlobalExecutionSummaryRoute(router, licenseState);

    const [config, handler] = router.get.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/internal/alerting/_global_execution_summary"`);

    rulesClient.getGlobalExecutionSummaryWithAuth.mockResolvedValue(mockedSummary);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        query: {
          date_start: dateStart,
          date_end: dateEnd,
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(rulesClient.getGlobalExecutionSummaryWithAuth).toHaveBeenCalledTimes(1);
    expect(rulesClient.getGlobalExecutionSummaryWithAuth.mock.calls[0]).toEqual([
      {
        dateStart,
        dateEnd,
      },
    ]);

    expect(res.ok).toHaveBeenCalled();
  });
});
