/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';

interface UpdateRequest extends Hapi.Request {
  payload: {
    name: string;
    config: Record<string, any>;
    secrets: Record<string, any>;
  };
}

export const updateActionRoute = {
  method: 'PUT',
  path: `/api/action/{id}`,
  config: {
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
          name: Joi.string().required(),
          config: Joi.object().default({}),
          secrets: Joi.object().default({}),
        })
        .required(),
    },
  },
  async handler(request: UpdateRequest) {
    const { id } = request.params;
    const { name, config, secrets } = request.payload;
    const actionsClient = request.getActionsClient!();
    return await actionsClient.update({ id, action: { name, config, secrets } });
  },
};
