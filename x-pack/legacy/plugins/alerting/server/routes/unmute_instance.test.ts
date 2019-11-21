/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createMockServer } from './_mock_server';
import { unmuteAlertInstanceRoute } from './unmute_instance';

const { server, alertsClient } = createMockServer();
server.route(unmuteAlertInstanceRoute);

test('unmutes an alert instance', async () => {
  const request = {
    method: 'POST',
    url: '/api/alert/1/alert_instance/2/_unmute',
  };

  const { statusCode } = await server.inject(request);
  expect(statusCode).toBe(204);
  expect(alertsClient.unmuteInstance).toHaveBeenCalledWith({ alertId: '1', alertInstanceId: '2' });
});
