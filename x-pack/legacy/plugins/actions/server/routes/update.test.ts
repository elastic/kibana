/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { updateRoute } from './update';
import { ActionResult } from '../types';

const { server, actionsClient } = createMockServer();
updateRoute(server);

beforeEach(() => {
  jest.resetAllMocks();
});

it('calls the update function with proper parameters', async () => {
  const request = {
    method: 'PUT',
    url: '/api/action/1',
    payload: {
      description: 'My description',
      config: { foo: true },
    },
  };
  const updateResult: ActionResult = {
    id: '1',
    actionTypeId: 'my-action-type-id',
    description: 'My description',
    config: { foo: true },
  };

  actionsClient.update.mockResolvedValueOnce(updateResult);
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  const response = JSON.parse(payload);
  expect(response).toEqual({
    id: '1',
    actionTypeId: 'my-action-type-id',
    description: 'My description',
    config: { foo: true },
  });
  expect(actionsClient.update).toHaveBeenCalledTimes(1);
  expect(actionsClient.update.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "action": Object {
          "config": Object {
            "foo": true,
          },
          "description": "My description",
          "secrets": Object {},
        },
        "id": "1",
      },
    ]
  `);
});
