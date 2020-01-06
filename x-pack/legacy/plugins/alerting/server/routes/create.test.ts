/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';
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
  throttle: '30s',
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

  const createdAt = new Date();
  const updatedAt = new Date();
  alertsClient.create.mockResolvedValueOnce({
    ...mockedAlert,
    enabled: true,
    muteAll: false,
    createdBy: '',
    updatedBy: '',
    apiKey: '',
    apiKeyOwner: '',
    mutedInstanceIds: [],
    createdAt,
    updatedAt,
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
  expect(new Date(response.createdAt)).toEqual(createdAt);
  expect(omit(response, 'createdAt', 'updatedAt')).toMatchInlineSnapshot(`
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
      "apiKey": "",
      "apiKeyOwner": "",
      "consumer": "bar",
      "createdBy": "",
      "enabled": true,
      "id": "123",
      "muteAll": false,
      "mutedInstanceIds": Array [],
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
      "throttle": "30s",
      "updatedBy": "",
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
          "throttle": "30s",
        },
      },
    ]
  `);
});
