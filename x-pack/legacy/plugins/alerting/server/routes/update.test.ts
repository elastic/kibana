/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { updateAlertRoute } from './update';

const { server, alertsClient } = createMockServer();
updateAlertRoute(server);

beforeEach(() => jest.resetAllMocks());

const mockedResponse = {
  id: '1',
  alertTypeId: '1',
  interval: '12s',
  alertTypeParams: {
    otherField: false,
  },
  actions: [
    {
      group: 'default',
      id: '2',
      params: {
        baz: true,
      },
    },
  ],
};

test('calls the update function with proper parameters', async () => {
  const request = {
    method: 'PUT',
    url: '/api/alert/1',
    payload: {
      interval: '12s',
      alertTypeParams: {
        otherField: false,
      },
      actions: [
        {
          group: 'default',
          id: '2',
          params: {
            baz: true,
          },
        },
      ],
    },
  };

  alertsClient.update.mockResolvedValueOnce(mockedResponse);
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  const response = JSON.parse(payload);
  expect(response).toEqual(mockedResponse);
  expect(alertsClient.update).toHaveBeenCalledTimes(1);
  expect(alertsClient.update.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  Object {
    "data": Object {
      "actions": Array [
        Object {
          "group": "default",
          "id": "2",
          "params": Object {
            "baz": true,
          },
        },
      ],
      "alertTypeParams": Object {
        "otherField": false,
      },
      "interval": "12s",
    },
    "id": "1",
  },
]
`);
});
