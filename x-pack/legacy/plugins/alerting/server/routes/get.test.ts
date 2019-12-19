/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { getAlertRoute } from './get';

const { server, alertsClient } = createMockServer();
server.route(getAlertRoute);

const mockedAlert = {
  id: '1',
  alertTypeId: '1',
  schedule: { interval: '10s' },
  params: {
    bar: true,
  },
  actions: [
    {
      group: 'default',
      id: '2',
      actionTypeId: 'test',
      params: {
        foo: true,
      },
    },
  ],
};

beforeEach(() => jest.resetAllMocks());

test('calls get with proper parameters', async () => {
  const request = {
    method: 'GET',
    url: '/api/alert/1',
  };

  alertsClient.get.mockResolvedValueOnce(mockedAlert);
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(200);
  const response = JSON.parse(payload);
  expect(response).toEqual(mockedAlert);
  expect(alertsClient.get).toHaveBeenCalledTimes(1);
  expect(alertsClient.get.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  Object {
    "id": "1",
  },
]
`);
});
