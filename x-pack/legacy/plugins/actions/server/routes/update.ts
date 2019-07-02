/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';

import { SavedObjectReference } from '../types';

interface UpdateRequest extends Hapi.Request {
  payload: {
    attributes: {
      description: string;
      actionTypeId: string;
      actionTypeConfig: Record<string, any>;
    };
    version?: string;
    references: SavedObjectReference[];
  };
}

export function updateRoute(server: Hapi.Server) {
  server.route({
    method: 'PUT',
    path: `/api/action/{id}`,
    options: {
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
            attributes: Joi.object()
              .keys({
                description: Joi.string().required(),
                actionTypeConfig: Joi.object().required(),
              })
              .required(),
            version: Joi.string(),
            references: Joi.array()
              .items(
                Joi.object().keys({
                  name: Joi.string().required(),
                  type: Joi.string().required(),
                  id: Joi.string().required(),
                })
              )
              .default([]),
          })
          .required(),
      },
    },
    async handler(request: UpdateRequest) {
      const { id } = request.params;
      const { attributes, version, references } = request.payload;
      const options = { version, references };
      const actionsClient = request.getActionsClient!();
      await actionsClient.update({
        id,
        attributes,
        options,
      });
      return { id };
    },
  });
}
