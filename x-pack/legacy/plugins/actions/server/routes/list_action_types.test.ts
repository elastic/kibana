/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { listActionTypesRoute } from './list_action_types';

const { server, actionTypeRegistry } = createMockServer();
server.route(listActionTypesRoute);

beforeEach(() => {
  jest.resetAllMocks();
});

it('calls the list function', async () => {
  const request = {
    method: 'GET',
    url: '/api/action/types',
  };
  const expectedResult = [
    {
      id: '1',
      name: 'One',
      enabled: true,
    },
  ];

  actionTypeRegistry.list.mockReturnValueOnce(expectedResult);
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  const response = JSON.parse(payload);
  expect(response).toEqual(expectedResult);
  expect(actionTypeRegistry.list).toHaveBeenCalledTimes(1);
  expect(actionTypeRegistry.list.mock.calls[0]).toMatchInlineSnapshot(`Array []`);
});
