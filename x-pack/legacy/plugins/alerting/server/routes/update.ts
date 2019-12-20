/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';
import { getDurationSchema } from '../lib';
import { IntervalSchedule } from '../types';

interface UpdateRequest extends Hapi.Request {
  params: {
    id: string;
  };
  payload: {
    alertTypeId: string;
    name: string;
    tags: string[];
    schedule: IntervalSchedule;
    actions: Array<{
      group: string;
      id: string;
      params: Record<string, any>;
    }>;
    params: Record<string, any>;
    throttle: string | null;
  };
}

export const updateAlertRoute = {
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
          throttle: getDurationSchema()
            .required()
            .allow(null),
          name: Joi.string().required(),
          tags: Joi.array()
            .items(Joi.string())
            .required(),
          schedule: Joi.object()
            .keys({
              interval: getDurationSchema().required(),
            })
            .required(),
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
  async handler(request: UpdateRequest) {
    const { id } = request.params;
    const alertsClient = request.getAlertsClient!();
    return await alertsClient.update({ id, data: request.payload });
  },
};
