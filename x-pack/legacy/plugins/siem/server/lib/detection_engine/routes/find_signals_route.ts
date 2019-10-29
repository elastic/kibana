/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';
import { findSignals } from '../alerts/find_signals';
import { FindSignalsRequest } from '../alerts/types';
import { findSignalsSchema } from './schemas';

export const createFindSignalRoute: Hapi.ServerRoute = {
  method: 'GET',
  path: '/api/siem/signals/_find',
  options: {
    tags: ['access:signals-all'],
    validate: {
      options: {
        abortEarly: false,
      },
      query: findSignalsSchema,
    },
  },
  async handler(request: FindSignalsRequest, headers) {
    const { query } = request;
    const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
    const actionsClient = isFunction(request.getActionsClient) ? request.getActionsClient() : null;

    if (!alertsClient || !actionsClient) {
      return headers.response().code(404);
    }

    return findSignals({
      alertsClient,
      perPage: query.per_page,
      page: query.page,
      sortField: query.sort_field,
    });
  },
};

export const findSignalsRoute = (server: Hapi.Server) => {
  server.route(createFindSignalRoute);
};
