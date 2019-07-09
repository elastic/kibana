/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { createRoute } from './create';

const { server, actionsClient } = createMockServer();
createRoute(server);

beforeEach(() => {
  jest.resetAllMocks();
});

it('creates an action with proper parameters', async () => {
  const request = {
    method: 'POST',
    url: '/api/action',
    payload: {
      attributes: {
        description: 'My description',
        actionTypeId: 'abc',
        actionTypeConfig: { foo: true },
      },
      migrationVersion: {
        abc: '1.2.3',
      },
      references: [
        {
          name: 'ref_0',
          type: 'bcd',
          id: '234',
        },
      ],
    },
  };
  const createResult = {
    id: '1',
    type: 'action',
    attributes: {
      description: 'My description',
      actionTypeId: 'abc',
      actionTypeConfig: { foo: true },
      actionTypeConfigSecrets: {},
    },
    migrationVersion: {
      abc: '1.2.3',
    },
    references: [
      {
        name: 'ref_0',
        type: 'bcd',
        id: '234',
      },
    ],
  };

  actionsClient.create.mockResolvedValueOnce(createResult);
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  const response = JSON.parse(payload);
  expect(response).toEqual({ id: '1' });
  expect(actionsClient.create).toHaveBeenCalledTimes(1);
  expect(actionsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  Object {
    "attributes": Object {
      "actionTypeConfig": Object {
        "foo": true,
      },
      "actionTypeId": "abc",
      "description": "My description",
    },
    "options": Object {
      "migrationVersion": Object {
        "abc": "1.2.3",
      },
      "references": Array [
        Object {
          "id": "234",
          "name": "ref_0",
          "type": "bcd",
        },
      ],
    },
  },
]
`);
});
