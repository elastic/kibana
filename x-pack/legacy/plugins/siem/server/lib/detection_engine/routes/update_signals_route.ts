/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Joi from 'joi';
import { isFunction } from 'lodash/fp';
import { updateSignal } from '../alerts/update_signals';
import { UpdateSignalsRequest } from '../alerts/types';
import { updateSignalSchema } from './schemas';

export const createUpdateSignalsRoute: Hapi.ServerRoute = {
  method: 'PUT',
  path: '/api/siem/signals/{id?}',
  options: {
    tags: ['access:signals-all'],
    validate: {
      options: {
        abortEarly: false,
      },
      params: {
        id: Joi.when(Joi.ref('$payload.id'), {
          is: Joi.exist(),
          then: Joi.string().optional(),
          otherwise: Joi.string().required(),
        }),
      },
      payload: updateSignalSchema,
    },
  },
  async handler(request: UpdateSignalsRequest, headers) {
    const {
      description,
      enabled,
      filter,
      from,
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
      to,
      type,
      references,
    } = request.payload;

    const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
    const actionsClient = isFunction(request.getActionsClient) ? request.getActionsClient() : null;

    if (!alertsClient || !actionsClient) {
      return headers.response().code(404);
    }
    return updateSignal({
      alertsClient,
      actionsClient,
      description,
      enabled,
      filter,
      from,
      query,
      language,
      savedId,
      filters,
      id: request.params.id ? request.params.id : id,
      index,
      interval,
      maxSignals,
      name,
      severity,
      size,
      to,
      type,
      references,
    });
  },
};

export const updateSignalsRoute = (server: Hapi.Server) => {
  server.route(createUpdateSignalsRoute);
};
