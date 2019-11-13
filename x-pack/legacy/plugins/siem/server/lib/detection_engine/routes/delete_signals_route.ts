/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';

import { deleteSignals } from '../alerts/delete_signals';
import { RequestFacade, ServerFacade } from '../../../types';

export const createDeleteSignalsRoute: Hapi.ServerRoute = {
  method: 'DELETE',
  path: '/api/siem/signals/{id}',
  options: {
    tags: ['access:signals-all'],
    validate: {
      options: {
        abortEarly: false,
      },
    },
  },
  async handler(request: RequestFacade, headers) {
    const { id } = request.params;
    const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
    const actionsClient = isFunction(request.getActionsClient) ? request.getActionsClient() : null;

    if (alertsClient == null || actionsClient == null) {
      return headers.response().code(404);
    }

    return deleteSignals({
      actionsClient,
      alertsClient,
      id,
    });
  },
};

export const deleteSignalsRoute = (server: ServerFacade): void => {
  server.route(createDeleteSignalsRoute);
};
