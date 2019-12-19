/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { createAlertRoute } from './create';

const { server, alertsClient } = createMockServer();
server.route(createAlertRoute);

const mockedAlert = {
  alertTypeId: '1',
  consumer: 'bar',
  name: 'abc',
  schedule: { interval: '10s' },
  tags: ['foo'],
  params: {
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
    actions: [
      {
        ...mockedAlert.actions[0],
        actionTypeId: 'test',
      },
    ],
  });
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  const response = JSON.parse(payload);
  expect(response).toMatchInlineSnapshot(`
    Object {
      "actions": Array [
        Object {
          "actionTypeId": "test",
          "group": "default",
          "id": "2",
          "params": Object {
            "foo": true,
          },
        },
      ],
      "alertTypeId": "1",
      "consumer": "bar",
      "id": "123",
      "name": "abc",
      "params": Object {
        "bar": true,
      },
      "schedule": Object {
        "interval": "10s",
      },
      "tags": Array [
        "foo",
      ],
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
          "consumer": "bar",
          "enabled": true,
          "name": "abc",
          "params": Object {
            "bar": true,
          },
          "schedule": Object {
            "interval": "10s",
          },
          "tags": Array [
            "foo",
          ],
          "throttle": null,
        },
      },
    ]
  `);
});
