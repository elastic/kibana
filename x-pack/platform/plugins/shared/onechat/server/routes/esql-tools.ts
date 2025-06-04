/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';

export function registerESQLToolsRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.post(
    {
      path: '/api/chat/tools/esql/create',
      security: {
        authz: {
          enabled: false,
          reason: '',
        },
      },
      validate: {
        body: schema.object({
            id: schema.maybe(schema.string()),
            name: schema.string(),
            description: schema.string(),
            query: schema.string(),
            params: schema.maybe(
                schema.object({
                    key: schema.string(),
                    value: schema.object({
                        type: schema.string(),
                        description: schema.string(),
                    })
                    }
                )
            )
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { tools: toolService } = getInternalServices();
      const registry = toolService.registry.asScopedPublicRegistry({ request });
      
      return response.ok({
        body: {
          tools: {},
        },
      });
    })
  );
}