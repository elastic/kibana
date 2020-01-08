/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { createActionRoute } from './create';

const { server, actionsClient } = createMockServer();
server.route(createActionRoute);

beforeEach(() => {
  jest.resetAllMocks();
});

it('creates an action with proper parameters', async () => {
  const request = {
    method: 'POST',
    url: '/api/action',
    payload: {
      name: 'My name',
      actionTypeId: 'abc',
      config: { foo: true },
      secrets: {},
    },
  };
  const createResult = {
    id: '1',
    name: 'My name',
    actionTypeId: 'abc',
    config: { foo: true },
  };

  actionsClient.create.mockResolvedValueOnce(createResult);
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  const response = JSON.parse(payload);
  expect(response).toEqual({
    id: '1',
    name: 'My name',
    actionTypeId: 'abc',
    config: { foo: true },
  });
  expect(actionsClient.create).toHaveBeenCalledTimes(1);
  expect(actionsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "action": Object {
          "actionTypeId": "abc",
          "config": Object {
            "foo": true,
          },
          "name": "My name",
          "secrets": Object {},
        },
      },
    ]
  `);
});
