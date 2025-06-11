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
import { EsqlToolCreateRequest } from '@kbn/onechat-plugin/common/tools';

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
        const tool = client.get(request.params.id);

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

  router.get(
    {
      path: '/api/chat/tools/esql',
      security: {
        authz: {
          enabled: false,
          reason: '',
        },
      },
      validate: false
    },
    wrapHandler(async (ctx, request, response) => {
      try {
        const { esql: esqlToolClientService } = getInternalServices();
        const client = await esqlToolClientService.getScopedClient({ request });

        const tools = await client.list();

        return response.ok({
          body: {
            tools: tools,
          },
        });
      } catch (error) {
        throw error;
      }
    })
  );

  router.post(
    {
      path: '/api/chat/tools/esql/{id}/_execute',
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
        body: schema.object({}, { unknowns: 'allow' }), 
      },
    },
    wrapHandler(async (ctx, request, response) => {
      try {
        const { esql: esqlToolClientService } = getInternalServices();
        const client = await esqlToolClientService.getScopedClient({ request });
        const responseDoc = await client.execute(request.params.id, request.body);

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

        const tool: EsqlToolCreateRequest = {
          id: request.body.id || 'esql',
          description: request.body.description || 'Tool for executing ESQL queries',
          query: request.body.query,
          params: request.body.params || {},
          meta: {
            tags: request.body.meta.tags || [],
            providerId: esqlToolProviderId,
          },
        };
        
        await client.create(tool);

        return response.ok({
          body: {
            esqlTool: {...request.body},
          },
        });
    } catch (error) {
        throw error;
      }
    })
  );
}