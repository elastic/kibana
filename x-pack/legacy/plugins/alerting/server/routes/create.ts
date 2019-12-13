/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Joi from 'joi';
import { getDurationSchema } from '../lib';

interface ScheduleRequest extends Hapi.Request {
  payload: {
    enabled: boolean;
    name: string;
    tags: string[];
    alertTypeId: string;
    consumer: string;
    interval: string;
    actions: Array<{
      group: string;
      id: string;
      params: Record<string, any>;
    }>;
    params: Record<string, any>;
    throttle: string | null;
  };
}

export const createAlertRoute = {
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
          name: Joi.string().required(),
          tags: Joi.array()
            .items(Joi.string())
            .default([]),
          alertTypeId: Joi.string().required(),
          consumer: Joi.string().required(),
          throttle: getDurationSchema().default(null),
          interval: getDurationSchema().required(),
          params: Joi.object().required(),
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
};
