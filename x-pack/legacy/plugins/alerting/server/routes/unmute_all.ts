/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

interface UnmuteAllRequest extends Hapi.Request {
  params: {
    id: string;
  };
}

export const unmuteAllAlertRoute = {
  method: 'POST',
  path: '/api/alert/{id}/_unmute_all',
  config: {
    tags: ['access:alerting-all'],
    response: {
      emptyStatusCode: 204,
    },
  },
  async handler(request: UnmuteAllRequest, h: Hapi.ResponseToolkit) {
    const alertsClient = request.getAlertsClient!();
    await alertsClient.unmuteAll(request.params);
    return h.response();
  },
};
