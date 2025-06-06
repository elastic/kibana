/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { ToolSourceType } from '@kbn/onechat-common';

export function registerESQLToolsRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.get(
    {
      path: '/api/chat/tools/esql/{id}',
      security: {
        authz: {
          enabled: false,
          reason: '',
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      try {
        const { esql: esqlToolClientService } = getInternalServices();
        const client = await esqlToolClientService.getClient({ request });
        const tool = await client.get(request.params.id);

        return response.ok({
          body: {
            esqlTool: tool,
          },
        });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: { 
            message: 'Error retrieving ESQL tool',
          }
        });
      }
    })
  );

  router.post(
    {
      path: '/api/chat/tools/esql',
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
          params: schema.arrayOf(
            schema.object({
              key: schema.string(),
              value: schema.object({
                type: schema.string(),
                description: schema.string(),
              }),
            }),
            { defaultValue: [] }
          ),
          meta: schema.object({
            sourceType: schema.literal(ToolSourceType.esql),
            sourceId: schema.string(),
            tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
          }),
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      try {
        const { tools: toolService, esql: esqlToolService } = getInternalServices();
        // const registry = toolService.registry.asScopedPublicRegistry({ request });
        const client = await esqlToolService.getClient({ request });
        const tool = await client.create(request.body);
        

        return response.ok({
          body: {
            esqlTool: {tool},
          },
        });
    } catch (error) {
        return response.customError({
            statusCode: 500,
            body: { 
                message: 'Failed to initialize ESQL client',
            }
        });
      }
    })
  );
}