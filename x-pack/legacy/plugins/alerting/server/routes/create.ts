/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Joi from 'joi';
import { AlertAction } from '../types';
import { getDurationSchema } from '../lib';

interface ScheduleRequest extends Hapi.Request {
  payload: {
    enabled: boolean;
    alertTypeId: string;
    interval: string;
    actions: AlertAction[];
    alertTypeParams: Record<string, any>;
    throttle: string | null;
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
            throttle: getDurationSchema().default(null),
            interval: getDurationSchema().required(),
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
