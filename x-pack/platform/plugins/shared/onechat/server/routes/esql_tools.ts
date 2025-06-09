/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { esqlToolProviderId } from '@kbn/onechat-common';

export function registerESQLToolsRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // add apiPriveleges for ESQL tools
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
        const client = await esqlToolClientService.getScopedClient({ request });
        const tool = await client.get(request.params.id);

        return response.ok({
          body: {
            esqlTool: tool,
          },
        });
      } catch (error) {
        throw error;
      }
    })
  );

  router.post(
    {
      path: '/api/chat/tools/esql/{name}/_execute',
      security: {
        authz: {
          enabled: false,
          reason: '',
        },
      },
      validate: {
        params: schema.object({
          name: schema.string(),
        }),
        body: schema.object({}, { unknowns: 'allow' }), 
      },
    },
    wrapHandler(async (ctx, request, response) => {
      try {
        const { esql: esqlToolClientService } = getInternalServices();
        const client = await esqlToolClientService.getScopedClient({ request });
        const responseDoc = await client.execute(request.params.name, request.body);

        return response.ok({
          body: {
            response: responseDoc,
          },
        });
      } catch (error) {
        throw error;
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
          params: schema.recordOf(
            schema.string(),
            schema.object({
              type: schema.string(),
              description: schema.string(),
            })
          ),
          meta: schema.object({
            tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
          }),
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      try {
        const { esql: esqlToolService } = getInternalServices();
        const client = await esqlToolService.getScopedClient({ request });
        const tool = await client.create({
          ...request.body,
          meta: {
            ...request.body.meta,
            providerId: esqlToolProviderId,
          },
        });

        return response.ok({
          body: {
            esqlTool: {tool},
          },
        });
    } catch (error) {
        throw error;
      }
    })
  );
}