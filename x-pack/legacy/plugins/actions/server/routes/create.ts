/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';
import { ActionResult, WithoutQueryAndParams } from '../types';

interface CreateRequest extends WithoutQueryAndParams<Hapi.Request> {
  query: {
    overwrite: boolean;
  };
  params: {
    id?: string;
  };
  payload: {
    description: string;
    actionTypeId: string;
    config: Record<string, any>;
    secrets: Record<string, any>;
  };
}

export function createRoute(server: Hapi.Server) {
  server.route({
    method: 'POST',
    path: `/api/action`,
    options: {
      validate: {
        options: {
          abortEarly: false,
        },
        payload: Joi.object()
          .keys({
            description: Joi.string().required(),
            actionTypeId: Joi.string().required(),
            config: Joi.object().default({}),
            secrets: Joi.object().default({}),
          })
          .required(),
      },
    },
    async handler(request: CreateRequest): Promise<ActionResult> {
      const actionsClient = request.getActionsClient!();

      const action = request.payload;
      return await actionsClient.create({ action });
    },
  });
}
