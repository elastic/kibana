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

export const deleteActionRoute = {
  method: 'DELETE',
  path: `/api/action/{id}`,
  config: {
    tags: ['access:actions-all'],
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
    const actionsClient = request.getActionsClient!();
    await actionsClient.delete({ id });
    return h.response().code(204);
  },
};
