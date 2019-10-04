/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { createAlertRoute } from './create';

const { server, alertsClient } = createMockServer();
createAlertRoute(server);

const mockedAlert = {
  alertTypeId: '1',
  interval: '10s',
  alertTypeParams: {
    bar: true,
  },
  actions: [
    {
      group: 'default',
      id: '2',
      params: {
        foo: true,
      },
    },
  ],
};

beforeEach(() => jest.resetAllMocks());

test('creates an alert with proper parameters', async () => {
  const request = {
    method: 'POST',
    url: '/api/alert',
    payload: mockedAlert,
  };

  alertsClient.create.mockResolvedValueOnce({
    ...mockedAlert,
    id: '123',
  });
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  const response = JSON.parse(payload);
  expect(response).toMatchInlineSnapshot(`
        Object {
          "actions": Array [
            Object {
              "group": "default",
              "id": "2",
              "params": Object {
                "foo": true,
              },
            },
          ],
          "alertTypeId": "1",
          "alertTypeParams": Object {
            "bar": true,
          },
          "id": "123",
          "interval": "10s",
        }
    `);
  expect(alertsClient.create).toHaveBeenCalledTimes(1);
  expect(alertsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "data": Object {
          "actions": Array [
            Object {
              "group": "default",
              "id": "2",
              "params": Object {
                "foo": true,
              },
            },
          ],
          "alertTypeId": "1",
          "alertTypeParams": Object {
            "bar": true,
          },
          "enabled": true,
          "interval": "10s",
          "throttle": null,
        },
      },
    ]
  `);
  expect(alertsClient.create).toHaveBeenCalledTimes(1);
  expect(alertsClient.create.mock.calls[0]).toMatchInlineSnapshot(`
    Array [
      Object {
        "data": Object {
          "actions": Array [
            Object {
              "group": "default",
              "id": "2",
              "params": Object {
                "foo": true,
              },
            },
          ],
          "alertTypeId": "1",
          "alertTypeParams": Object {
            "bar": true,
          },
          "enabled": true,
          "interval": "10s",
          "throttle": null,
        },
      },
    ]
  `);
});
