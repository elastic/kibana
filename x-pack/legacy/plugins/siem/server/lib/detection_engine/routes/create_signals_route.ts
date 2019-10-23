/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Joi from 'joi';
import { isFunction } from 'lodash/fp';
import { createSignals } from '../alerts/create_signals';
import { SignalsRequest } from '../alerts/types';

export const schema = Joi.object({
  description: Joi.string().required(),
  enabled: Joi.boolean().default(true),
  filter: Joi.object(),
  filters: Joi.array(),
  from: Joi.string().required(),
  id: Joi.string().required(),
  index: Joi.array().required(),
  interval: Joi.string().default('5m'),
  // TODO: Change kql to be just query?
  kql: Joi.string(),
  query: Joi.string(),
  save_id: Joi.string(),
  max_signals: Joi.number().default(100),
  name: Joi.string().required(),
  severity: Joi.string().required(),
  to: Joi.string().required(),
  type: Joi.string()
    .valid('filter', 'kql', 'query')
    .required(),
  references: Joi.array().default([]),
});

export const createCreateSignalsRoute: Hapi.ServerRoute = {
  method: 'POST',
  path: '/api/siem/signals',
  options: {
    tags: ['access:signals-all'],
    validate: {
      options: {
        abortEarly: false,
      },
      payload: schema,
    },
  },
  async handler(request: SignalsRequest, headers) {
    const {
      description,
      enabled,
      filter,
      kql,
      from,
      query,
      save_id,
      filters,
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

    return createSignals({
      alertsClient,
      actionsClient,
      description,
      enabled,
      filter,
      from,
      query,
      save_id,
      filters,
      id,
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

export const createSignalsRoute = (server: Hapi.Server) => {
  server.route(createCreateSignalsRoute);
};
