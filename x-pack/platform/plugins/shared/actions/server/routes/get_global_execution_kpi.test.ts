/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../lib/license_state.mock';
import { mockHandlerArguments } from './_mock_handler_arguments';
import { actionsClientMock } from '../actions_client/actions_client.mock';
import { getGlobalExecutionKPIRoute } from './get_global_execution_kpi';
import { verifyAccessAndContext } from './verify_access_and_context';

const actionsClient = actionsClientMock.create();
jest.mock('./verify_access_and_context', () => ({
  verifyAccessAndContext: jest.fn(),
}));
beforeEach(() => {
  jest.resetAllMocks();
  (verifyAccessAndContext as jest.Mock).mockImplementation((license, handler) => handler);
});

describe('getGlobalExecutionKPIRoute', () => {
  const dateString = new Date().toISOString();
  const mockedExecutionLog = {
    success: 3,
    unknown: 0,
    failure: 0,
    warning: 0,
  };

  it('gets global execution KPI', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();

    getGlobalExecutionKPIRoute(router, licenseState);

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(
      `"/internal/actions/_global_connector_execution_kpi"`
    );

    actionsClient.getGlobalExecutionKpiWithAuth.mockResolvedValue(mockedExecutionLog);

    const [context, req, res] = mockHandlerArguments(
      { actionsClient },
      {
        body: {
          date_start: dateString,
        },
      },
      ['ok']
    );

    await handler(context, req, res);

    expect(actionsClient.getGlobalExecutionKpiWithAuth).toHaveBeenCalledTimes(1);
    expect(actionsClient.getGlobalExecutionKpiWithAuth.mock.calls[0]).toEqual([
      {
        dateStart: dateString,
      },
    ]);

    expect(res.ok).toHaveBeenCalled();
  });
});
