/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Joi from 'joi';
import { AlertAction } from '../types';

interface ScheduleRequest extends Hapi.Request {
  payload: {
    enabled: boolean;
    alertTypeId: string;
    interval: number;
    actions: AlertAction[];
    alertTypeParams: Record<string, any>;
  };
}

export function createAlertRoute(server: Hapi.Server) {
  server.route({
    method: 'POST',
    path: '/api/alert',
    options: {
      validate: {
        options: {
          abortEarly: false,
        },
        payload: Joi.object()
          .keys({
            enabled: Joi.boolean().default(true),
            alertTypeId: Joi.string().required(),
            interval: Joi.number().required(),
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
