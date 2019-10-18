/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';
import { ActionExecutorContract } from '../lib';

interface ExecuteRequest extends Hapi.Request {
  params: {
    id: string;
  };
  payload: {
    params: Record<string, any>;
  };
}

export function getExecuteActionRoute(actionExecutor: ActionExecutorContract) {
  return {
    method: 'POST',
    path: '/api/action/{id}/_execute',
    config: {
      tags: ['access:actions-read'],
      response: {
        emptyStatusCode: 204,
      },
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
            params: Joi.object().required(),
          })
          .required(),
      },
    },
    async handler(request: ExecuteRequest, h: Hapi.ResponseToolkit) {
      const { id } = request.params;
      const { params } = request.payload;
      return await actionExecutor.execute({
        params,
        request,
        actionId: id,
      });
    },
  };
}
