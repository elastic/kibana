/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';

const createDataConnectorRequestSchema = schema.object({
  type: schema.string({ minLength: 1 }),
});

export function registerRoutes(router: IRouter, logger: Logger) {
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
        return response.ok({
          body: 'Data connector created successfully',
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
