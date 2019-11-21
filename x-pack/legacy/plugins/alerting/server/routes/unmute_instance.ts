/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

interface UnmuteInstanceRequest extends Hapi.Request {
  params: {
    alertId: string;
    alertInstanceId: string;
  };
}

export const unmuteAlertInstanceRoute = {
  method: 'POST',
  path: '/api/alert/{alertId}/alert_instance/{alertInstanceId}/_unmute',
  config: {
    tags: ['access:alerting-all'],
    response: {
      emptyStatusCode: 204,
    },
  },
  async handler(request: UnmuteInstanceRequest, h: Hapi.ResponseToolkit) {
    const alertsClient = request.getAlertsClient!();
    await alertsClient.unmuteInstance(request.params);
    return h.response();
  },
};
