/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';
import { AlertAction } from '../types';

interface UpdateRequest extends Hapi.Request {
  params: {
    id: string;
  };
  payload: {
    enabled: boolean;
    alertTypeId: string;
    interval: number;
    actions: AlertAction[];
    alertTypeParams: Record<string, any>;
  };
}

export function updateAlertRoute(server: Hapi.Server) {
  server.route({
    method: 'PUT',
    path: '/api/alert/{id}',
    options: {
      validate: {
        options: {
          abortEarly: false,
        },
        payload: Joi.object()
          .keys({
            enabled: Joi.boolean().required(),
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
    async handler(request: UpdateRequest) {
      const { id } = request.params;
      const alertsClient = request.getAlertsClient!();
      return await alertsClient.update({ id, data: request.payload });
    },
  });
}
