/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Joi from 'joi';
import { isFunction } from 'lodash/fp';
import { updateSignal } from '../alerts/update_signals';
import { SignalsRequest } from '../alerts/types';

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
      payload: Joi.object({
        description: Joi.string(),
        enabled: Joi.boolean(),
        filter: Joi.object(),
        from: Joi.string(),
        id: Joi.string(),
        index: Joi.array(),
        interval: Joi.string(),
        kql: Joi.string(),
        max_signals: Joi.number().default(100),
        name: Joi.string(),
        severity: Joi.string(),
        to: Joi.string(),
        type: Joi.string().valid('filter', 'kql'),
        references: Joi.array().default([]),
      }).nand('filter', 'kql'),
    },
  },
  async handler(request: SignalsRequest, headers) {
    const {
      description,
      enabled,
      filter,
      kql,
      from,
      id,
      index,
      interval,
      // eslint-disable-next-line @typescript-eslint/camelcase
      max_signals: maxSignals,
      name,
      severity,
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
      id: request.params.id ? request.params.id : id,
      index,
      interval,
      kql,
      maxSignals,
      name,
      severity,
      to,
      type,
      references,
    });
  },
};

export const updateSignalsRoute = (server: Hapi.Server) => {
  server.route(createUpdateSignalsRoute);
};
