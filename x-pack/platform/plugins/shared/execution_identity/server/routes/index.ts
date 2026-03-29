/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import type { ExecutionIdentityService } from '../service';

export function registerRoutes(router: IRouter, service: ExecutionIdentityService, logger: Logger) {
  router.post(
    {
      path: '/internal/execution_identity',
      access: 'internal',
      security: {
        authz: {
          enabled: false,
          reason: 'PoC - authorization not yet implemented',
        },
      },
      validate: {
        body: schema.object({
          name: schema.string({ minLength: 1, maxLength: 256 }),
          description: schema.string({ defaultValue: '' }),
          role_descriptors: schema.recordOf(schema.string(), schema.any()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const identity = await service.create(request, request.body);
        return response.ok({ body: identity });
      } catch (error) {
        logger.error(`Failed to create execution identity: ${error.message}`);
        return response.customError({
          statusCode: 500,
          body: { message: error.message },
        });
      }
    }
  );

  router.get(
    {
      path: '/internal/execution_identity',
      access: 'internal',
      security: {
        authz: {
          enabled: false,
          reason: 'PoC - authorization not yet implemented',
        },
      },
      validate: false,
    },
    async (context, request, response) => {
      try {
        const identities = await service.list();
        return response.ok({ body: identities });
      } catch (error) {
        logger.error(`Failed to list execution identities: ${error.message}`);
        return response.customError({
          statusCode: 500,
          body: { message: error.message },
        });
      }
    }
  );

  router.get(
    {
      path: '/internal/execution_identity/{id}',
      access: 'internal',
      security: {
        authz: {
          enabled: false,
          reason: 'PoC - authorization not yet implemented',
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const identity = await service.get(request.params.id);
        return response.ok({ body: identity });
      } catch (error) {
        logger.error(`Failed to get execution identity: ${error.message}`);
        return response.customError({
          statusCode: 404,
          body: { message: error.message },
        });
      }
    }
  );

  router.delete(
    {
      path: '/internal/execution_identity/{id}',
      access: 'internal',
      security: {
        authz: {
          enabled: false,
          reason: 'PoC - authorization not yet implemented',
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        await service.delete(request.params.id, request);
        return response.ok({ body: { success: true } });
      } catch (error) {
        logger.error(`Failed to delete execution identity: ${error.message}`);
        return response.customError({
          statusCode: 500,
          body: { message: error.message },
        });
      }
    }
  );
}
