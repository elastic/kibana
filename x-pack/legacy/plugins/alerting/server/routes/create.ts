/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Joi from 'joi';
import { AlertAction } from '../types';
import { SECONDS_REGEX, MINUTES_REGEX, HOURS_REGEX, DAYS_REGEX } from '../lib';

interface ScheduleRequest extends Hapi.Request {
  payload: {
    enabled: boolean;
    alertTypeId: string;
    interval: string;
    actions: AlertAction[];
    alertTypeParams: Record<string, any>;
  };
}

export function createAlertRoute(server: Hapi.Server) {
  server.route({
    method: 'POST',
    path: '/api/alert',
    options: {
      tags: ['access:alerting-all'],
      validate: {
        options: {
          abortEarly: false,
        },
        payload: Joi.object()
          .keys({
            enabled: Joi.boolean().default(true),
            alertTypeId: Joi.string().required(),
            interval: Joi.alternatives()
              .try(
                Joi.string()
                  .regex(SECONDS_REGEX, 'seconds (5s)')
                  .required(),
                Joi.string()
                  .regex(MINUTES_REGEX, 'minutes (5m)')
                  .required(),
                Joi.string()
                  .regex(HOURS_REGEX, 'hours (5h)')
                  .required(),
                Joi.string()
                  .regex(DAYS_REGEX, 'days (5d)')
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
    async handler(request: ScheduleRequest) {
      const alertsClient = request.getAlertsClient!();
      return await alertsClient.create({ data: request.payload });
    },
  });
}
