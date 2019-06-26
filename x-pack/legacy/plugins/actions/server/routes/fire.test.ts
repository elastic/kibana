/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../lib/execute', () => ({
  execute: jest.fn(),
}));

import { createMockServer } from './_mock_server';
import { fireRoute } from './fire';

const getServices = jest.fn();

const { server, actionTypeRegistry, savedObjectsClient } = createMockServer();
fireRoute({ server, actionTypeRegistry, getServices });

beforeEach(() => jest.resetAllMocks());

it('fires an action with proper parameters', async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { execute } = require('../lib/execute');

  const request = {
    method: 'POST',
    url: '/api/action/1/_fire',
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
  execute.mockResolvedValueOnce({ success: true });

  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(204);
  expect(payload).toBe('');

  expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
  expect(savedObjectsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  "action",
  "1",
]
`);
  expect(execute).toHaveBeenCalledTimes(1);
  const executeCall = execute.mock.calls[0][0];
  expect(executeCall.params).toEqual({
    foo: true,
  });
  expect(executeCall.actionTypeRegistry).toBeTruthy();
  expect(executeCall.actionId).toBe('1');
  expect(executeCall.namespace).toBeUndefined();
  expect(executeCall.services).toBeTruthy();
  expect(executeCall.encryptedSavedObjectsPlugin).toBeTruthy();
});
