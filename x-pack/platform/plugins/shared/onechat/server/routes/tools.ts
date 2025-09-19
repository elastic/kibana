/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import path from 'node:path';
import { editableToolTypes } from '@kbn/onechat-common';
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
import { publicApiPath } from '../../common/constants';
import { getTechnicalPreviewWarning } from './utils';

const TECHNICAL_PREVIEW_WARNING = getTechnicalPreviewWarning('Elastic Tool API');

export function registerToolsRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // list tools API
  router.versioned
    .get({
      path: `${publicApiPath}/tools`,
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
      {
        version: '2023-10-31',
        validate: false,
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/tools_list.yaml')
        },
      },
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
      path: `${publicApiPath}/tools/{id}`,
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
              id: schema.string({
                meta: { description: 'The unique identifier of the tool to retrieve.' }
              }),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/tools_get_by_id.yaml')
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
      path: `${publicApiPath}/tools`,
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
              id: schema.string({
                meta: { description: 'Unique identifier for the tool.' }
              }),
              // @ts-expect-error schema.oneOf expects at least one element, and `map` returns a list
              type: schema.oneOf(editableToolTypes.map((type) => schema.literal(type)), {
                meta: { description: 'The type of tool to create (e.g., esql, index_search).' }
              }),
              description: schema.string({
                defaultValue: '',
                meta: { description: 'Description of what the tool does.' }
              }),
              tags: schema.arrayOf(schema.string({
                meta: { description: 'Tag for categorizing the tool.' }
              }), {
                defaultValue: [],
                meta: { description: 'Optional tags for categorizing and organizing tools.' }
              }),
              // actual config validation is done in the tool service
              configuration: schema.recordOf(schema.string(), schema.any(), {
                meta: { description: 'Tool-specific configuration parameters. See examples for details.' }
              }),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/tools_create.yaml')
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
      path: `${publicApiPath}/tools/{toolId}`,
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
              toolId: schema.string({
                meta: { description: 'The unique identifier of the tool to update.' }
              }),
            }),
            body: schema.object({
              description: schema.maybe(schema.string({
                meta: { description: 'Updated description of what the tool does.' }
              })),
              tags: schema.maybe(schema.arrayOf(schema.string({
                meta: { description: 'Updated tag for categorizing the tool.' }
              }), {
                meta: { description: 'Updated tags for categorizing and organizing tools.' }
              })),
              // actual config validation is done in the tool service
              configuration: schema.maybe(schema.recordOf(schema.string(), schema.any(), {
                meta: { description: 'Updated tool-specific configuration parameters. See examples for details.' }
              })),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/tools_update.yaml')
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
      path: `${publicApiPath}/tools/{id}`,
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
              id: schema.string({
                meta: { description: 'The unique identifier of the tool to delete.' }
              }),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/tools_delete.yaml')
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
      path: `${publicApiPath}/tools/_execute`,
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
              tool_id: schema.string({
                meta: { description: 'The ID of the tool to execute.' }
              }),
              tool_params: schema.recordOf(schema.string(), schema.any(), {
                meta: { description: 'Parameters to pass to the tool execution. See examples for details' }
              }),
              connector_id: schema.maybe(schema.string({
                meta: { description: 'Optional connector ID for tools that require external integrations.' }
              })),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/tools_execute.yaml')
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const {
          tool_id: id,
          tool_params: toolParams,
          connector_id: defaultConnectorId,
        } = request.body;
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

        const toolResult = await registry.execute({ toolId: id, toolParams, defaultConnectorId });

        return response.ok({
          body: {
            results: toolResult.results,
          },
        });
      })
    );
}
