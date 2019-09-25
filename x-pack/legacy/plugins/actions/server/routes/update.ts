/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from '@hapi/joi';
import Hapi from '@hapi/hapi';

interface UpdateRequest extends Hapi.Request {
  payload: {
    description: string;
    config: Record<string, any>;
    secrets: Record<string, any>;
  };
}

export function updateRoute(server: Hapi.Server) {
  server.route({
    method: 'PUT',
    path: `/api/action/{id}`,
    options: {
      tags: ['access:actions-all'],
      validate: {
        options: {
          abortEarly: false,
        },
        params: Joi.object()
          .keys({
            id: Joi.string().required(),
          })
          .required(),
        payload: Joi.object()
          .keys({
            description: Joi.string().required(),
            config: Joi.object().default({}),
            secrets: Joi.object().default({}),
          })
          .required(),
      },
    },
    async handler(request: UpdateRequest) {
      const { id } = request.params;
      const { description, config, secrets } = request.payload;
      const actionsClient = request.getActionsClient!();
      return await actionsClient.update({ id, action: { description, config, secrets } });
    },
  });
}
