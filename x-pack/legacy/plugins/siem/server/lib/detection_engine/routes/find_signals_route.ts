/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Joi from 'joi';
import { isFunction } from 'lodash/fp';
import { findSignals } from '../alerts/find_signals';

interface FindSignalsRequest extends Omit<Hapi.Request, 'query'> {
  query: {
    per_page: number;
    page: number;
    search?: string;
    sort_field?: string;
    fields?: string[];
  };
}

export const findSignalsRoute = (server: Hapi.Server) => {
  server.route({
    method: 'GET',
    path: '/api/siem/signals/_find',
    options: {
      tags: ['access:signals-all'],
      validate: {
        options: {
          abortEarly: false,
        },
        query: Joi.object()
          .keys({
            per_page: Joi.number()
              .min(0)
              .default(20),
            page: Joi.number()
              .min(1)
              .default(1),
            sort_field: Joi.string(),
            fields: Joi.array()
              .items(Joi.string())
              .single(),
          })
          .default(),
      },
    },
    async handler(request: FindSignalsRequest, headers) {
      const { query } = request;
      const alertsClient = isFunction(request.getAlertsClient) ? request.getAlertsClient() : null;
      if (alertsClient == null) {
        return headers.response().code(404);
      }

      return findSignals({
        alertsClient,
        perPage: query.per_page,
        page: query.page,
        sortField: query.sort_field,
      });
    },
  });
};
