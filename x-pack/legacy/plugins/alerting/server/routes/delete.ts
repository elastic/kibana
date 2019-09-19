/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Hapi from 'hapi';
import Joi from 'joi';

interface DeleteRequest extends Hapi.Request {
  params: {
    id: string;
  };
}

export const deleteAlertRoute = {
  method: 'DELETE',
  path: '/api/alert/{id}',
  config: {
    tags: ['access:alerting-all'],
    validate: {
      params: Joi.object()
        .keys({
          id: Joi.string().required(),
        })
        .required(),
    },
  },
  async handler(request: DeleteRequest, h: Hapi.ResponseToolkit) {
    const { id } = request.params;
    const alertsClient = request.getAlertsClient!();
    await alertsClient.delete({ id });
    return h.response().code(204);
  },
};
