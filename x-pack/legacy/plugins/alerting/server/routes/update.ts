/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';
import { AlertAction } from '../types';
import { SECONDS_REGEX, MINUTES_REGEX, HOURS_REGEX, DAYS_REGEX } from '../lib';

interface UpdateRequest extends Hapi.Request {
  params: {
    id: string;
  };
  payload: {
    alertTypeId: string;
    interval: string;
    actions: AlertAction[];
    alertTypeParams: Record<string, any>;
  };
}

export function updateAlertRoute(server: Hapi.Server) {
  server.route({
    method: 'PUT',
    path: '/api/alert/{id}',
    options: {
      tags: ['access:alerting-all'],
      validate: {
        options: {
          abortEarly: false,
        },
        payload: Joi.object()
          .keys({
            interval: Joi.alternatives()
              .try(
                Joi.string()
                  .regex(SECONDS_REGEX, 'seconds')
                  .required(),
                Joi.string()
                  .regex(MINUTES_REGEX, 'minutes')
                  .required(),
                Joi.string()
                  .regex(HOURS_REGEX, 'hours')
                  .required(),
                Joi.string()
                  .regex(DAYS_REGEX, 'days')
                  .required()
              )
              .required(),
            alertTypeParams: Joi.object().required(),
            actions: Joi.array()
              .items(
                Joi.object().keys({
                  group: Joi.string().required(),
                  id: Joi.string().required(),
                  params: Joi.object().required(),
                })
              )
              .required(),
          })
          .required(),
      },
    },
    async handler(request: UpdateRequest) {
      const { id } = request.params;
      const alertsClient = request.getAlertsClient!();
      return await alertsClient.update({ id, data: request.payload });
    },
  });
}
