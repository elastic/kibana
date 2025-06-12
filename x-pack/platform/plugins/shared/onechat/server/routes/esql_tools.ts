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
import { apiPrivileges } from '../../common/features';

export function registerESQLToolsRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.get(
    {
      path: '/api/chat/tools/esql/{id}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
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
            tool: tool,
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
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
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
      path: '/api/chat/tools/esql',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      validate: {
        body: schema.object({
          id: schema.string(),
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

        const now = new Date();

        const tool: EsqlToolCreateRequest = {
          id: request.body.id || 'esql',
          description: request.body.description || 'Tool for executing ESQL queries',
          query: request.body.query,
          params: request.body.params || {},
          meta: {
            tags: request.body.meta.tags || [],
            providerId: esqlToolProviderId,
          },
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        };
        
        await client.create(tool);

        return response.ok({
          body: {
            tool: {...request.body},
          },
        });
    } catch (error) {
        throw error;
      }
    })
  );

  router.put(
    {
      path: '/api/chat/tools/esql/{id}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          id: schema.maybe(schema.string()),
          description: schema.maybe(schema.string()),
          query: schema.maybe(schema.string()),
          params: schema.maybe(schema.recordOf(
            schema.string(),
            schema.object({
              type: schema.string(),
              description: schema.string(),
            })
          )),
          meta: schema.maybe(schema.object({
            tags: schema.maybe(schema.arrayOf(schema.string())),
            providerId: schema.maybe(schema.string()),
          })),
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      try {
        const { esql: esqlToolService } = getInternalServices();
        const client = await esqlToolService.getScopedClient({ request });

        const toolId = request.params.id;

        const updates: Partial<EsqlToolCreateRequest> = {
          ...(request.body.description && { description: request.body.description }),
          ...(request.body.query && { query: request.body.query }),
          ...(request.body.params && { params: request.body.params }),
          ...(request.body.meta && { 
            meta: {
              ...(request.body.meta.tags && { tags: request.body.meta.tags }),
              ...(request.body.meta.providerId && { providerId: request.body.meta.providerId }),
            }
          }),
        };
        
        const updatedTool = await client.update(toolId, updates);

        return response.ok({
          body: {
            esqlTool: updatedTool,
          },
        });
      } catch (error) {
        throw error;
      }
    })
  );

  router.delete(
    {
        path: '/api/chat/tools/esql/{id}',
        security: {
          authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
        },
        validate: {
            params: schema.object({
                id: schema.string(),
            }),
        },
    },
    wrapHandler(async (ctx, request, response) => {
        try {
            const { esql: esqlToolService } = getInternalServices();
            const client = await esqlToolService.getScopedClient({ request });

            const toolId = request.params.id;
            const result = await client.delete(toolId);

            return response.ok({
              body: {
                success: result,
              },
            });
          } catch (error) {
            throw error;
          }
        })
);
}