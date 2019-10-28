/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { unmuteAllAlertRoute } from './unmute_all';

const { server, alertsClient } = createMockServer();
server.route(unmuteAllAlertRoute);

test('unmutes an alert', async () => {
  const request = {
    method: 'POST',
    url: '/api/alert/1/_unmute_all',
  };

  const { statusCode } = await server.inject(request);
  expect(statusCode).toBe(204);
  expect(alertsClient.unmuteAll).toHaveBeenCalledWith({ id: '1' });
});
