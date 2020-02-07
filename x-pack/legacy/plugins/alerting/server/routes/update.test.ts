/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { updateAlertRoute } from './update';

const { server, alertsClient } = createMockServer();
server.route(updateAlertRoute);

beforeEach(() => jest.resetAllMocks());

const mockedResponse = {
  id: '1',
  alertTypeId: '1',
  tags: ['foo'],
  schedule: { interval: '12s' },
  params: {
    otherField: false,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  actions: [
    {
      group: 'default',
      id: '2',
      actionTypeId: 'test',
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
      throttle: null,
      name: 'abc',
      tags: ['bar'],
      schedule: { interval: '12s' },
      params: {
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
  const { createdAt, updatedAt, ...response } = JSON.parse(payload);
  expect({ createdAt: new Date(createdAt), updatedAt: new Date(updatedAt), ...response }).toEqual(
    mockedResponse
  );
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
          "name": "abc",
          "params": Object {
            "otherField": false,
          },
          "schedule": Object {
            "interval": "12s",
          },
          "tags": Array [
            "bar",
          ],
          "throttle": null,
        },
        "id": "1",
      },
    ]
  `);
});
