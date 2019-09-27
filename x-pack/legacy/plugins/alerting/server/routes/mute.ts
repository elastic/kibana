/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

interface MuteRequest extends Hapi.Request {
  params: {
    id: string;
  };
}

export function muteAlertRoute(server: Hapi.Server) {
  server.route({
    method: 'POST',
    path: '/api/alert/{id}/_mute_all',
    options: {
      tags: ['access:alerting-all'],
      response: {
        emptyStatusCode: 204,
      },
    },
    async handler(request: MuteRequest, h: Hapi.ResponseToolkit) {
      const alertsClient = request.getAlertsClient!();
      await alertsClient.muteAll(request.params);
      return h.response();
    },
  });
}
