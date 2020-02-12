/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';

interface GetAlertStateRequest extends Hapi.Request {
  params: {
    id: string;
  };
}

export const getAlertStateRoute = {
  method: 'GET',
  path: '/api/alert/{id}/state',
  options: {
    tags: ['access:alerting-read'],
    validate: {
      params: Joi.object()
        .keys({
          id: Joi.string().required(),
        })
        .required(),
    },
  },
  async handler(request: GetAlertStateRequest, h: Hapi.ResponseToolkit) {
    const { id } = request.params;
    const alertsClient = request.getAlertsClient!();
    const state = await alertsClient.getAlertState({ id });
    return state ? state : h.response().code(204);
  },
};
