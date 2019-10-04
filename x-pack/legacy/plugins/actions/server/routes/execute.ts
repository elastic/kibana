/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';
import { execute } from '../lib';
import { SpacesPlugin } from '../../../spaces';
import { ActionTypeRegistryContract, GetServicesFunction } from '../types';
import { EncryptedSavedObjectsPlugin } from '../../../encrypted_saved_objects';
import { Logger } from '../../../../../../src/core/server';

interface ExecuteRequest extends Hapi.Request {
  params: {
    id: string;
  };
  payload: {
    params: Record<string, any>;
  };
}

interface ExecuteRouteOptions {
  logger: Logger;
  spaces?: SpacesPlugin;
  actionTypeRegistry: ActionTypeRegistryContract;
  getServices: GetServicesFunction;
  encryptedSavedObjects: EncryptedSavedObjectsPlugin;
}

export function getExecuteActionRoute({
  logger,
  actionTypeRegistry,
  getServices,
  encryptedSavedObjects,
  spaces,
}: ExecuteRouteOptions) {
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
      const namespace = spaces && spaces.getSpaceId(request);
      const result = await execute({
        logger,
        params,
        actionTypeRegistry,
        actionId: id,
        namespace: namespace === 'default' ? undefined : namespace,
        services: getServices(request),
        encryptedSavedObjectsPlugin: encryptedSavedObjects,
      });
      return result;
    },
  };
}
