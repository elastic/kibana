/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';

import { readSignals } from '../alerts/read_signals';

export const createReadSignalsRoute: Hapi.ServerRoute = {
  method: 'GET',
  path: '/api/siem/signals/{id}',
  options: {
    tags: ['access:signals-all'],
    validate: {
      options: {
        abortEarly: false,
      },
    },
  },
  async handler(request: Hapi.Request, headers) {
    const { id } = request.params;
    const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
    const actionsClient = isFunction(request.getActionsClient) ? request.getActionsClient() : null;

    if (!alertsClient || !actionsClient) {
      return headers.response().code(404);
    }
    return readSignals({
      alertsClient,
      id,
    });
  },
};

export const readSignalsRoute = (server: Hapi.Server) => {
  server.route(createReadSignalsRoute);
};
