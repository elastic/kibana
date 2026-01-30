/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import path from 'node:path';
import { editableToolTypes } from '@kbn/agent-builder-common';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { toDescriptor, toDescriptorWithSchema } from '../services/tools/utils/tool_conversion';
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
import { AGENT_SOCKET_TIMEOUT_MS } from './utils';

export function registerToolsRoutes({
  router,
  getInternalServices,
  logger,
  analyticsService,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // list tools API
  router.versioned
    .get({
      path: `${publicApiPath}/tools`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'List tools',
      description:
        'List all available tools. Use this endpoint to retrieve complete tool definitions including their schemas and configuration requirements.',
      options: {
        tags: ['tools', 'oas-tag:agent builder'],
        availability: {
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/tools_list.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { tools: toolService } = getInternalServices();
        const registry = await toolService.getRegistry({ request });
        const tools = await registry.list({});
        return response.ok<ListToolsResponse>({
          body: {
            results: tools.map(toDescriptor),
          },
        });
      })
    );

  // get tool by ID
  router.versioned
    .get({
      path: `${publicApiPath}/tools/{toolId}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Get a tool by id',
      description:
        'Get a specific tool by ID. Use this endpoint to retrieve the complete tool definition including its schema and configuration requirements.',
      options: {
        tags: ['tools', 'oas-tag:agent builder'],
        availability: {
          since: '9.2.0',
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
                meta: { description: 'The unique identifier of the tool to retrieve.' },
              }),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/tools_get_by_id.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { toolId } = request.params;
        const { tools: toolService } = getInternalServices();
        const registry = await toolService.getRegistry({ request });
        const tool = await registry.get(toolId);
        return response.ok<GetToolResponse>({
          body: await toDescriptorWithSchema(tool),
        });
      })
    );

  // create tool
  router.versioned
    .post({
      path: `${publicApiPath}/tools`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageAgentBuilder] },
      },
      access: 'public',
      summary: 'Create a tool',
      description:
        'Create a new tool. Use this endpoint to define a custom tool with specific functionality and configuration for use by agents.',
      options: {
        tags: ['tools', 'oas-tag:agent builder'],
        availability: {
          since: '9.2.0',
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
                meta: { description: 'Unique identifier for the tool.' },
              }),
              type: schema.oneOf(
                // @ts-expect-error TS2769: No overload matches this call
                editableToolTypes.map((type) => schema.literal(type)),
                {
                  meta: { description: 'The type of tool to create (e.g., esql, index_search).' },
                }
              ),
              description: schema.string({
                defaultValue: '',
                meta: { description: 'Description of what the tool does.' },
              }),
              tags: schema.arrayOf(
                schema.string({
                  meta: { description: 'Tag for categorizing the tool.' },
                }),
                {
                  defaultValue: [],
                  meta: { description: 'Optional tags for categorizing and organizing tools.' },
                }
              ),
              // actual config validation is done in the tool service
              configuration: schema.recordOf(schema.string(), schema.any(), {
                meta: {
                  description: 'Tool-specific configuration parameters. See examples for details.',
                },
              }),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/tools_create.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { tools: toolService } = getInternalServices();
        const createRequest: CreateToolPayload = request.body;
        const registry = await toolService.getRegistry({ request });
        const tool = await registry.create(createRequest);
        analyticsService?.reportToolCreated({
          toolId: createRequest.id,
          toolType: createRequest.type,
        });
        return response.ok<CreateToolResponse>({
          body: await toDescriptorWithSchema(tool),
        });
      })
    );

  // update tool
  router.versioned
    .put({
      path: `${publicApiPath}/tools/{toolId}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageAgentBuilder] },
      },
      access: 'public',
      summary: 'Update a tool',
      description:
        "Update an existing tool. Use this endpoint to modify any aspect of the tool's configuration or metadata.",
      options: {
        tags: ['tools', 'oas-tag:agent builder'],
        availability: {
          since: '9.2.0',
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
                meta: { description: 'The unique identifier of the tool to update.' },
              }),
            }),
            body: schema.object({
              description: schema.maybe(
                schema.string({
                  meta: { description: 'Updated description of what the tool does.' },
                })
              ),
              tags: schema.maybe(
                schema.arrayOf(
                  schema.string({
                    meta: { description: 'Updated tag for categorizing the tool.' },
                  }),
                  {
                    meta: { description: 'Updated tags for categorizing and organizing tools.' },
                  }
                )
              ),
              // actual config validation is done in the tool service
              configuration: schema.maybe(
                schema.recordOf(schema.string(), schema.any(), {
                  meta: {
                    description:
                      'Updated tool-specific configuration parameters. See examples for details.',
                  },
                })
              ),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/tools_update.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { tools: toolService } = getInternalServices();
        const { toolId } = request.params;
        const update: UpdateToolPayload = request.body;
        const registry = await toolService.getRegistry({ request });
        const tool = await registry.update(toolId, update);
        return response.ok<UpdateToolResponse>({
          body: await toDescriptorWithSchema(tool),
        });
      })
    );

  // delete tool
  router.versioned
    .delete({
      path: `${publicApiPath}/tools/{toolId}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageAgentBuilder] },
      },
      access: 'public',
      summary: 'Delete a tool',
      description: 'Delete a tool by ID. This action cannot be undone.',
      options: {
        tags: ['tools', 'oas-tag:agent builder'],
        availability: {
          since: '9.2.0',
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
                meta: { description: 'The unique identifier of the tool to delete.' },
              }),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/tools_delete.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { toolId } = request.params;
        const { tools: toolService } = getInternalServices();
        const registry = await toolService.getRegistry({ request });
        const success = await registry.delete(toolId);
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
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Execute a Tool',
      description:
        'Execute a tool with parameters. Use this endpoint to run a tool directly with specified inputs and optional external connector integration.',
      options: {
        timeout: {
          idleSocket: AGENT_SOCKET_TIMEOUT_MS,
        },
        tags: ['tools', 'oas-tag:agent builder'],
        availability: {
          since: '9.2.0',
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
                meta: { description: 'The ID of the tool to execute.' },
              }),
              tool_params: schema.recordOf(schema.string(), schema.any(), {
                meta: {
                  description: 'Parameters to pass to the tool execution. See examples for details',
                },
              }),
              connector_id: schema.maybe(
                schema.string({
                  meta: {
                    description:
                      'Optional connector ID for tools that require external integrations.',
                  },
                })
              ),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/tools_execute.yaml'),
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
        const toolSchema = await tool.getSchema();
        const validation = toolSchema.safeParse(toolParams);
        if (validation.error) {
          return response.badRequest({
            body: {
              message: `Invalid parameters: ${validation.error.message}`,
            },
          });
        }

        const toolResult = await registry.execute({
          toolId: id,
          toolParams,
          source: 'user',
          defaultConnectorId,
        });

        return response.ok({
          body: {
            results: toolResult.results,
          },
        });
      })
    );
}
