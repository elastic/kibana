/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { updateApiKeyRoute } from './update_api_key';

const { server, alertsClient } = createMockServer();
updateApiKeyRoute(server);

test('updates api key for an alert', async () => {
  const request = {
    method: 'POST',
    url: '/api/alert/1/_update_api_key',
  };

  const { statusCode } = await server.inject(request);
  expect(statusCode).toBe(204);
  expect(alertsClient.updateApiKey).toHaveBeenCalledWith({ id: '1' });
});
