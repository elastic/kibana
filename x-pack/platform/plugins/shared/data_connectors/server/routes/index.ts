/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger, StartServicesAccessor } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { DataConnectorsServerStartDependencies } from '../types';

const createDataConnectorRequestSchema = schema.object({
  type: schema.string({ minLength: 1 }),
  token: schema.string({ minLength: 1 }),
});

export function registerRoutes(
  router: IRouter,
  logger: Logger,
  getStartServices: StartServicesAccessor<DataConnectorsServerStartDependencies>
) {
  // Create data connector
  router.post(
    {
      path: '/api/data_connectors',
      validate: {
        body: createDataConnectorRequestSchema,
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    },
    async (context, request, response) => {
      try {
        const [, { actions }] = await getStartServices();
        const actionsClient = await actions.getActionsClientWithRequest(request);
        const { token } = request.body;
        // TODO: extract these from data source registry
        const connector = await actionsClient.create({
          action: {
            name: 'My Notion connector',
            actionTypeId: '.notion',
            config: {},
            secrets: {
              authType: 'bearer',
              token,
            },
          },
        });
        return response.ok({
          body: `Data connector created successfully: ${connector.id}`,
        });
      } catch (error) {
        logger.error(`Error creating data connector: ${(error as Error).message}`);
        return response.customError({
          statusCode: 500,
          body: {
            message: `Failed to create data connector: ${(error as Error).message}`,
          },
        });
      }
    }
  );
}
