/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';

export const enableAlertRoute = {
  method: 'POST',
  path: '/api/alert/{id}/_enable',
  config: {
    tags: ['access:alerting-all'],
    response: {
      emptyStatusCode: 204,
    },
  },
  async handler(request: Hapi.Request, h: Hapi.ResponseToolkit) {
    const alertsClient = request.getAlertsClient!();
    await alertsClient.enable({ id: request.params.id });
    return h.response();
  },
};
