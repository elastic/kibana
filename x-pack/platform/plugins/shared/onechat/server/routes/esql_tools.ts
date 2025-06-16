/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';
import { esqlToolProviderId } from '@kbn/onechat-common';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { EsqlToolCreateRequest } from '../../common/tools';
import { apiPrivileges } from '../../common/features';
import { v4 as uuidv4 } from 'uuid';


const TECHNICAL_PREVIEW_WARNING =
  'Elastic ESQL Tool API is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.';

export function registerESQLToolsRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.get(
    {
      path: '/api/chat/tools/esql/{id}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      options: {
        tags: ['esql'],
        description: TECHNICAL_PREVIEW_WARNING,
        availability: {
          stability: 'experimental',
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
            tool,
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
      options: {
        tags: ['esql'],
        description: TECHNICAL_PREVIEW_WARNING,
        availability: {
          stability: 'experimental',
        },
      },
      validate: false,
    },
    wrapHandler(async (ctx, request, response) => {
      try {
        const { esql: esqlToolClientService } = getInternalServices();
        const client = await esqlToolClientService.getScopedClient({ request });

        const tools = await client.list();

        return response.ok({
          body: {
            tools,
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
      options: {
        tags: ['esql'],
        description: TECHNICAL_PREVIEW_WARNING,
        availability: {
          stability: 'experimental',
        },
      },
      validate: {
        body: schema.object({
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
        const toolid = uuidv4();

        const now = new Date();

        const tool: EsqlToolCreateRequest = {
          id: toolid,
          name: request.body.name,
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

        const createResponse = await client.create(tool);

        return response.ok({
          body: {
            tool: createResponse,
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
      options: {
        tags: ['esql'],
        description: TECHNICAL_PREVIEW_WARNING,
        availability: {
          stability: 'experimental',
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          id: schema.maybe(schema.string()),
          description: schema.maybe(schema.string()),
          query: schema.maybe(schema.string()),
          params: schema.maybe(
            schema.recordOf(
              schema.string(),
              schema.object({
                type: schema.string(),
                description: schema.string(),
              })
            )
          ),
          meta: schema.maybe(
            schema.object({
              tags: schema.maybe(schema.arrayOf(schema.string())),
              providerId: schema.maybe(schema.string()),
            })
          ),
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      try {
        const { esql: esqlToolService } = getInternalServices();
        const client = await esqlToolService.getScopedClient({ request });

        const toolId = request.params.id;

        const { description, query, params, meta } = request.body

        const updates: Partial<EsqlToolCreateRequest> = {
          id: request.body.id || toolId,
          description: description || undefined,
          query: query || undefined,
          params: params || undefined,
          ...(meta?.tags && {
            meta: {
              tags: meta.tags,
              providerId: esqlToolProviderId
            },
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
      options: {
        tags: ['esql'],
        description: TECHNICAL_PREVIEW_WARNING,
        availability: {
          stability: 'experimental',
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


