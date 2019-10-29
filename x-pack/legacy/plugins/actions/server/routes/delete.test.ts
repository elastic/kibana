/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { deleteActionRoute } from './delete';

const { server, actionsClient } = createMockServer();
server.route(deleteActionRoute);

beforeEach(() => {
  jest.resetAllMocks();
});

it('deletes an action with proper parameters', async () => {
  const request = {
    method: 'DELETE',
    url: '/api/action/1',
  };

  actionsClient.delete.mockResolvedValueOnce({ success: true });
  const { payload, statusCode } = await server.inject(request);
  expect(statusCode).toBe(204);
  expect(payload).toEqual('');
  expect(actionsClient.delete).toHaveBeenCalledTimes(1);
  expect(actionsClient.delete.mock.calls[0]).toMatchInlineSnapshot(`
Array [
  Object {
    "id": "1",
  },
]
`);
});
