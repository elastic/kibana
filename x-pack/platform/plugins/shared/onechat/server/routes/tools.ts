/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { toolToDescriptor } from '../services/tools/utils/tool_conversion';
import type { ListToolsResponse } from '../../common/http_api/tools';
import { apiPrivileges } from '../../common/features';

export function registerToolsRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // list tools API
  router.get(
    {
      path: '/api/chat/tools',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      validate: false,
    },
    wrapHandler(async (ctx, request, response) => {
      const { tools: toolService } = getInternalServices();
      const registry = await toolService.getRegistry({ request });
      const tools = await registry.list({});
      return response.ok<ListToolsResponse>({
        body: {
          tools: tools.map(toolToDescriptor),
        },
      });
    })
  );

  // get tool by ID
  router.get(
    {
      path: '/api/chat/tools/{id}',
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
      const { id } = request.params;
      const { tools: toolService } = getInternalServices();
      const registry = await toolService.getRegistry({ request });
      const tool = await registry.get(id);
      return response.ok<ListToolsResponse>({
        body: toolToDescriptor(tool),
      });
    })
  );

  const paramValueTypeSchema = schema.oneOf([
    schema.literal('text'),
    schema.literal('keyword'),
    schema.literal('long'),
    schema.literal('integer'),
    schema.literal('double'),
    schema.literal('float'),
    schema.literal('boolean'),
    schema.literal('date'),
    schema.literal('object'),
    schema.literal('nested'),
  ]);

  // create tool
  router.post(
    {
      path: '/api/chat/tools',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
      validate: {
        body: schema.object({
          id: schema.string(),
          type: schema.string({ defaultValue: 'esql' }),
          description: schema.string({ defaultValue: '' }),
          tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
          configuration: schema.object({
            query: schema.string(),
            params: schema.recordOf(
              schema.string(),
              schema.object({
                type: paramValueTypeSchema,
                description: schema.string(),
              })
            ),
          }),
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { tools: toolService } = getInternalServices();
      const { body } = request;
      const registry = await toolService.getRegistry({ request });
      const tool = await registry.create(body);
      return response.ok<ListToolsResponse>({
        body: toolToDescriptor(tool),
      });
    })
  );

  // update tool
  router.put(
    {
      path: '/api/chat/tools/{toolId}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
      validate: {
        params: schema.object({
          toolId: schema.string(),
        }),
        body: schema.object({
          description: schema.string({ defaultValue: '' }),
          tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
          configuration: schema.object({
            // TODO: factorize
            query: schema.string(),
            params: schema.recordOf(
              schema.string(),
              schema.object({
                type: paramValueTypeSchema,
                description: schema.string(),
              })
            ),
          }),
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { tools: toolService } = getInternalServices();
      const {
        body,
        params: { toolId },
      } = request;
      const registry = await toolService.getRegistry({ request });
      const tool = await registry.update(toolId, body);
      return response.ok<ListToolsResponse>({
        body: toolToDescriptor(tool),
      });
    })
  );

  // delete tool
  router.delete(
    {
      path: '/api/chat/tools/{id}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const { id } = request.params;
      const { tools: toolService } = getInternalServices();
      const registry = await toolService.getRegistry({ request });
      const success = await registry.delete(id);
      return response.ok({
        body: { success },
      });
    })
  );

  // execute a tool
  router.versioned
    .post({
      path: '/api/chat/tools/_execute',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'Execute a Tool',
      options: {
        tags: ['tools'],
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
              tool_id: schema.string({}),
              tool_params: schema.recordOf(schema.string(), schema.any()),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { tool_id: id, tool_params: toolParams } = request.body;
        const { tools: toolService } = getInternalServices();
        const registry = await toolService.getRegistry({ request });
        const tool = await registry.get(id);

        const validation = tool.schema.safeParse(toolParams);
        if (validation.error) {
          return response.badRequest({
            body: {
              message: `Invalid parameters: ${validation.error.message}`,
            },
          });
        }

        const toolResult = await registry.execute({ toolId: id, toolParams });

        return response.ok({
          body: {
            result: toolResult.result,
          },
        });
      })
    );
}
