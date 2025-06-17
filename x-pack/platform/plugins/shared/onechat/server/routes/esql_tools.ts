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
import { ESQL_TOOL_API_UI_SETTING_ID } from '@kbn/onechat-plugin/common/constants';


const TECHNICAL_PREVIEW_WARNING =
  'Elastic ESQL Tool API is in technical preview and may be changed or removed in a future release. Elastic will work to fix any issues, but features in technical preview are not subject to the support SLA of official GA features.';

export function registerESQLToolsRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  router.versioned
    .get({
      path: '/api/chat/tools/esql/{name}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'ESQL Tool API',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        tags: ['esql'],
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { params: schema.object({name: schema.string()}, { unknowns: 'allow' }) },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { uiSettings } = await ctx.core;
        const enabled = await uiSettings.client.get(ESQL_TOOL_API_UI_SETTING_ID);

        if (!enabled) {
          return response.notFound();
        }
        const { esql: esqlToolClientService } = getInternalServices();
        const client = await esqlToolClientService.getScopedClient({ request });

        logger.info(`Fetching ESQL tool with ID: ${request.params.name}`);
        const tool = await client.get(request.params.name);

        return response.ok({
          body: {
            tool,
          },
        });
    })
  );

  router.versioned
    .get({
      path: '/api/chat/tools/esql',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'ESQL Tool API',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        tags: ['esql'],
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
      },
    wrapHandler(async (ctx, request, response) => {
      const { uiSettings } = await ctx.core;
      const enabled = await uiSettings.client.get(ESQL_TOOL_API_UI_SETTING_ID);

      if (!enabled) {
        return response.notFound();
      }
      const { esql: esqlToolClientService } = getInternalServices();
      const client = await esqlToolClientService.getScopedClient({ request });

      const tools = await client.list();

      return response.ok({
        body: {
          tools,
        },
      });
    })
  );

  router.versioned
    .post({
      path: '/api/chat/tools/esql',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'ESQL Tool API',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        tags: ['esql'],
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: { 
          request: {
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
            }
          }
      },
    wrapHandler(async (ctx, request, response) => {
      const { uiSettings } = await ctx.core;
      const enabled = await uiSettings.client.get(ESQL_TOOL_API_UI_SETTING_ID);

      if (!enabled) {
        return response.notFound();
      }
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
    })
  );

  router.versioned
    .put({
      path: '/api/chat/tools/esql/{id}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'ESQL Tool API',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        tags: ['esql'],
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: { 
          request: {
              body: schema.object({
                id: schema.string(),
                name: schema.maybe(schema.string()),
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
                  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
                }))
              }),
            }
          }
      },
    wrapHandler(async (ctx, request, response) => {
      const { uiSettings } = await ctx.core;
      const enabled = await uiSettings.client.get(ESQL_TOOL_API_UI_SETTING_ID);

      if (!enabled) {
        return response.notFound();
      }
      const { esql: esqlToolService } = getInternalServices();
      const client = await esqlToolService.getScopedClient({ request });

      const toolId = request.body.id;

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
    })
  );

  router.versioned
    .delete({
      path: '/api/chat/tools/esql/{name}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'ESQL Tool API',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        tags: ['esql'],
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { params: schema.object({name: schema.string(),}, { unknowns: 'allow' }) },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { uiSettings } = await ctx.core;
        const enabled = await uiSettings.client.get(ESQL_TOOL_API_UI_SETTING_ID);

        if (!enabled) {
          return response.notFound();
        }
        const { esql: esqlToolService } = getInternalServices();
        const client = await esqlToolService.getScopedClient({ request });
        const result = await client.delete(request.params.name);

        return response.ok({
          body: {
            success: result,
          },
        });
    })
  );
}


