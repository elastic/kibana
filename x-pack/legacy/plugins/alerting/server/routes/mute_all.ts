/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

interface MuteAllRequest extends Hapi.Request {
  params: {
    id: string;
  };
}

export const muteAllAlertRoute = {
  method: 'POST',
  path: '/api/alert/{id}/_mute_all',
  config: {
    tags: ['access:alerting-all'],
    response: {
      emptyStatusCode: 204,
    },
  },
  async handler(request: MuteAllRequest, h: Hapi.ResponseToolkit) {
    const alertsClient = request.getAlertsClient!();
    await alertsClient.muteAll(request.params);
    return h.response();
  },
};
