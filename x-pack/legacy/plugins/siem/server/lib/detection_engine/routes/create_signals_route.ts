/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import { isFunction } from 'lodash/fp';
import { createSignals } from '../alerts/create_signals';
import { SignalsRequest } from '../alerts/types';
import { createSignalsSchema } from './schemas';
import { ServerFacade } from '../../../types';

export const createCreateSignalsRoute: Hapi.ServerRoute = {
  method: 'POST',
  path: '/api/siem/signals',
  options: {
    tags: ['access:signals-all'],
    validate: {
      options: {
        abortEarly: false,
      },
      payload: createSignalsSchema,
    },
  },
  async handler(request: SignalsRequest, headers) {
    const {
      description,
      enabled,
      // eslint-disable-next-line @typescript-eslint/camelcase
      false_positives: falsePositives,
      filter,
      from,
      immutable,
      query,
      language,
      // eslint-disable-next-line @typescript-eslint/camelcase
      saved_id: savedId,
      filters,
      id,
      index,
      interval,
      // eslint-disable-next-line @typescript-eslint/camelcase
      max_signals: maxSignals,
      name,
      severity,
      size,
      tags,
      to,
      type,
      references,
    } = request.payload;

    const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
    const actionsClient = isFunction(request.getActionsClient) ? request.getActionsClient() : null;

    if (!alertsClient || !actionsClient) {
      return headers.response().code(404);
    }

    return createSignals({
      alertsClient,
      actionsClient,
      description,
      enabled,
      falsePositives,
      filter,
      from,
      immutable,
      query,
      language,
      savedId,
      filters,
      id,
      index,
      interval,
      maxSignals,
      name,
      severity,
      size,
      tags,
      to,
      type,
      references,
    });
  },
};

export const createSignalsRoute = (server: ServerFacade) => {
  server.route(createCreateSignalsRoute);
};
