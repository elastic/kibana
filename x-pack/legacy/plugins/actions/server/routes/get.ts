/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';

interface GetRequest extends Hapi.Request {
  params: {
    id: string;
  };
}

export function getRoute(server: Hapi.Server) {
  server.route({
    method: 'GET',
    path: `/api/action/{id}`,
    options: {
      tags: ['access:actions-read'],
      validate: {
        params: Joi.object()
          .keys({
            id: Joi.string().required(),
          })
          .required(),
      },
    },
    async handler(request: GetRequest) {
      const { id } = request.params;
      const actionsClient = request.getActionsClient!();
      return await actionsClient.get({ id });
    },
  });
}
