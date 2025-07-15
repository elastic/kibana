/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { toDescriptorWithSchema } from '../services/tools/utils/tool_conversion';
import type {
  ListToolsResponse,
  GetToolResponse,
  DeleteToolResponse,
  CreateToolPayload,
  UpdateToolPayload,
  CreateToolResponse,
  UpdateToolResponse,
} from '../../common/http_api/tools';
import { apiPrivileges } from '../../common/features';
import {
  configurationSchema as esqlConfigSchema,
  configurationUpdateSchema as esqlConfigUpdateSchema,
} from '../services/tools/esql/schemas';
import { getTechnicalPreviewWarning, supportedToolTypes } from './utils';

const TECHNICAL_PREVIEW_WARNING = getTechnicalPreviewWarning('Elastic Tool API');

export function registerToolsRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // list tools API
  router.versioned
    .get({
      path: '/api/chat/tools',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'List tools',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        tags: ['tools'],
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      { version: '2023-10-31', validate: false },
      wrapHandler(async (ctx, request, response) => {
        const { tools: toolService } = getInternalServices();
        const registry = await toolService.getRegistry({ request });
        const tools = await registry.list({});
        return response.ok<ListToolsResponse>({
          body: {
            results: tools.map(toDescriptorWithSchema),
          },
        });
      })
    );

  // get tool by ID
  router.versioned
    .get({
      path: '/api/chat/tools/{id}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'Get a tool by id',
      description: TECHNICAL_PREVIEW_WARNING,
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
            params: schema.object({
              id: schema.string(),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { id } = request.params;
        const { tools: toolService } = getInternalServices();
        const registry = await toolService.getRegistry({ request });
        const tool = await registry.get(id);
        return response.ok<GetToolResponse>({
          body: toDescriptorWithSchema(tool),
        });
      })
    );

  // create tool
  router.versioned
    .post({
      path: '/api/chat/tools',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
      access: 'public',
      summary: 'Create a tool',
      description: TECHNICAL_PREVIEW_WARNING,
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
              id: schema.string(),
              type: supportedToolTypes,
              description: schema.string({ defaultValue: '' }),
              tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
              configuration: esqlConfigSchema,
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { tools: toolService } = getInternalServices();
        const createRequest: CreateToolPayload = request.body;
        const registry = await toolService.getRegistry({ request });
        const tool = await registry.create(createRequest);
        return response.ok<CreateToolResponse>({
          body: toDescriptorWithSchema(tool),
        });
      })
    );

  // update tool
  router.versioned
    .put({
      path: '/api/chat/tools/{toolId}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
      access: 'public',
      summary: 'Update a tool',
      description: TECHNICAL_PREVIEW_WARNING,
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
            params: schema.object({
              toolId: schema.string(),
            }),
            body: schema.object({
              description: schema.maybe(schema.string()),
              tags: schema.maybe(schema.arrayOf(schema.string())),
              configuration: schema.maybe(esqlConfigUpdateSchema),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { tools: toolService } = getInternalServices();
        const { toolId } = request.params;
        const update: UpdateToolPayload = request.body;
        const registry = await toolService.getRegistry({ request });
        const tool = await registry.update(toolId, update);
        return response.ok<UpdateToolResponse>({
          body: toDescriptorWithSchema(tool),
        });
      })
    );

  // delete tool
  router.versioned
    .delete({
      path: '/api/chat/tools/{id}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
      access: 'public',
      summary: 'Delete a tool',
      description: TECHNICAL_PREVIEW_WARNING,
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
            params: schema.object({
              id: schema.string(),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { id } = request.params;
        const { tools: toolService } = getInternalServices();
        const registry = await toolService.getRegistry({ request });
        const success = await registry.delete(id);
        return response.ok<DeleteToolResponse>({
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
