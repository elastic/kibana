/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { deleteAlertRoute } from './delete';

const { server, alertsClient } = createMockServer();
server.route(deleteAlertRoute);

beforeEach(() => jest.resetAllMocks());

test('deletes an alert with proper parameters', async () => {
  const request = {
    method: 'DELETE',
    url: '/api/alert/1',
  };

  alertsClient.delete.mockResolvedValueOnce({});
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(204);
  expect(payload).toEqual('');
  expect(alertsClient.delete).toHaveBeenCalledTimes(1);
  expect(alertsClient.delete.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  Object {
    "id": "1",
  },
]
`);
});
