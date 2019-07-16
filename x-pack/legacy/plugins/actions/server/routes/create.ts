/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Hapi from 'hapi';
import { WithoutQueryAndParams, SavedObjectReference } from '../types';

interface CreateRequest extends WithoutQueryAndParams<Hapi.Request> {
  query: {
    overwrite: boolean;
  };
  params: {
    id?: string;
  };
  payload: {
    attributes: {
      description: string;
      actionTypeId: string;
      actionTypeConfig: Record<string, any>;
    };
    migrationVersion?: Record<string, any>;
    references: SavedObjectReference[];
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
        payload: Joi.object().keys({
          attributes: Joi.object()
            .keys({
              description: Joi.string().required(),
              actionTypeId: Joi.string().required(),
              actionTypeConfig: Joi.object().required(),
            })
            .required(),
          migrationVersion: Joi.object().optional(),
          references: Joi.array()
            .items(
              Joi.object().keys({
                name: Joi.string().required(),
                type: Joi.string().required(),
                id: Joi.string().required(),
              })
            )
            .default([]),
        }),
      },
    },
    async handler(request: CreateRequest) {
      const actionsClient = request.getActionsClient!();

      const createdAction = await actionsClient.create({
        attributes: request.payload.attributes,
        options: {
          migrationVersion: request.payload.migrationVersion,
          references: request.payload.references,
        },
      });

      return { id: createdAction.id };
    },
  });
}
