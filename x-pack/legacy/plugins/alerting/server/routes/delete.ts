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

export function deleteAlertRoute(server: Hapi.Server) {
  server.route({
    method: 'DELETE',
    path: '/api/alert/{id}',
    options: {
      validate: {
        params: Joi.object()
          .keys({
            id: Joi.string().required(),
          })
          .required(),
      },
    },
    async handler(request: DeleteRequest) {
      const { id } = request.params;
      const alertsClient = request.getAlertsClient!();
      return await alertsClient.delete({ id });
    },
  });
}
