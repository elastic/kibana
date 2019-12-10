/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { getExecuteActionRoute } from './execute';
import { actionExecutorMock } from '../lib/action_executor.mock';

const getServices = jest.fn();

const { server } = createMockServer();
const mockedActionExecutor = actionExecutorMock.create();
server.route(getExecuteActionRoute(mockedActionExecutor));

beforeEach(() => jest.resetAllMocks());

it('executes an action with proper parameters', async () => {
  const request = {
    method: 'POST',
    url: '/api/action/1/_execute',
    payload: {
      params: {
        foo: true,
      },
    },
  };
  getServices.mockReturnValue({
    log: jest.fn(),
    callCluster: jest.fn(),
    savedObjectsClient: jest.fn(),
  });
  mockedActionExecutor.execute.mockResolvedValueOnce({ status: 'ok', actionId: '1' });

  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  expect(JSON.parse(payload)).toEqual({ status: 'ok', actionId: '1' });

  expect(mockedActionExecutor.execute).toHaveBeenCalledWith({
    actionId: '1',
    params: { foo: true },
    request: expect.anything(),
  });
});
