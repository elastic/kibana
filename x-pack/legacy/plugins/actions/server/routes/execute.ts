/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';
import { execute } from '../lib';
import { ActionTypeRegistryContract, GetServicesFunction } from '../types';

interface ExecuteRequest extends Hapi.Request {
  params: {
    id: string;
  };
  payload: {
    params: Record<string, any>;
  };
}

interface ExecuteRouteOptions {
  server: Hapi.Server;
  actionTypeRegistry: ActionTypeRegistryContract;
  getServices: GetServicesFunction;
}

export function executeRoute({ server, actionTypeRegistry, getServices }: ExecuteRouteOptions) {
  server.route({
    method: 'POST',
    path: '/api/action/{id}/_execute',
    options: {
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
      const namespace = server.plugins.spaces && server.plugins.spaces.getSpaceId(request);
      const result = await execute({
        params,
        actionTypeRegistry,
        actionId: id,
        namespace: namespace === 'default' ? undefined : namespace,
        services: getServices(request),
        encryptedSavedObjectsPlugin: server.plugins.encrypted_saved_objects!,
      });
      return result;
    },
  });
}
