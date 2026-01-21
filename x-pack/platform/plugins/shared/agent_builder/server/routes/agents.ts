/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import path from 'node:path';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { publicApiPath } from '../../common/constants';
import { apiPrivileges } from '../../common/features';
import type {
  GetAgentResponse,
  CreateAgentResponse,
  UpdateAgentResponse,
  DeleteAgentResponse,
  ListAgentResponse,
} from '../../common/http_api/agents';

const TOOL_SELECTION_SCHEMA = schema.arrayOf(
  schema.object(
    {
      tool_ids: schema.arrayOf(
        schema.string({
          meta: { description: 'Tool ID to be available to the agent.' },
        }),
        {
          meta: { description: 'Array of tool IDs that the agent can use.' },
        }
      ),
    },
    {
      meta: { description: 'Tool selection configuration for the agent.' },
    }
  )
);

export function registerAgentRoutes({
  router,
  getInternalServices,
  logger,
  analyticsService,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // List agents
  router.versioned
    .get({
      path: `${publicApiPath}/agents`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'List agents',
      description:
        'List all available agents. Use this endpoint to retrieve complete agent information including their current configuration and assigned tools.',
      options: {
        tags: ['agent', 'oas-tag:agent builder'],
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
          oasOperationObject: () => path.join(__dirname, 'examples/agents_list.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { agents: agentsService } = getInternalServices();
        const service = await agentsService.getRegistry({ request });
        const agents = await service.list();
        return response.ok<ListAgentResponse>({ body: { results: agents } });
      })
    );

  // Get agent by id
  router.versioned
    .get({
      path: `${publicApiPath}/agents/{id}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Get an agent by ID',
      description:
        'Get a specific agent by ID. Use this endpoint to retrieve the complete agent definition including all configuration details and tool assignments.',
      options: {
        tags: ['agent', 'oas-tag:agent builder'],
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
              id: schema.string({
                meta: { description: 'The unique identifier of the agent to retrieve.' },
              }),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/agents_get_by_id.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { agents } = getInternalServices();
        const service = await agents.getRegistry({ request });

        const profile = await service.get(request.params.id);
        return response.ok<GetAgentResponse>({ body: profile });
      })
    );

  // Create agent
  router.versioned
    .post({
      path: `${publicApiPath}/agents`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageAgentBuilder] },
      },
      access: 'public',
      summary: 'Create an agent',
      description:
        "Create a new agent. Use this endpoint to define the agent's behavior, appearance, and capabilities through comprehensive configuration options.",
      options: {
        tags: ['agent', 'oas-tag:agent builder'],
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
                meta: { description: 'Unique identifier for the agent.' },
              }),
              name: schema.string({
                meta: { description: 'Display name for the agent.' },
              }),
              description: schema.string({
                meta: { description: 'Description of what the agent does.' },
              }),
              avatar_color: schema.maybe(
                schema.string({
                  meta: { description: 'Optional hex color code for the agent avatar.' },
                })
              ),
              avatar_symbol: schema.maybe(
                schema.string({
                  meta: { description: 'Optional symbol/initials for the agent avatar.' },
                })
              ),
              labels: schema.maybe(
                schema.arrayOf(
                  schema.string({
                    meta: { description: 'Label for categorizing the agent.' },
                  }),
                  {
                    meta: {
                      description: 'Optional labels for categorizing and organizing agents.',
                    },
                  }
                )
              ),
              configuration: schema.object(
                {
                  instructions: schema.maybe(
                    schema.string({
                      meta: {
                        description: 'Optional system instructions that define the agent behavior.',
                      },
                    })
                  ),
                  tools: TOOL_SELECTION_SCHEMA,
                },
                {
                  meta: { description: 'Configuration settings for the agent.' },
                }
              ),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/agents_create.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { agents } = getInternalServices();
        const service = await agents.getRegistry({ request });
        const profile = await service.create(request.body);
        analyticsService?.reportAgentCreated({
          agentId: request.body.id,
          toolSelection: request.body.configuration.tools,
        });
        return response.ok<CreateAgentResponse>({ body: profile });
      })
    );

  // Update agent
  router.versioned
    .put({
      path: `${publicApiPath}/agents/{id}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageAgentBuilder] },
      },
      access: 'public',
      summary: 'Update an agent',
      description:
        "Update an existing agent configuration. Use this endpoint to modify any aspect of the agent's behavior, appearance, or capabilities.",
      options: {
        tags: ['agent', 'oas-tag:agent builder'],
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
              id: schema.string({
                meta: { description: 'The unique identifier of the agent to update.' },
              }),
            }),
            body: schema.object({
              name: schema.maybe(
                schema.string({
                  meta: { description: 'Updated display name for the agent.' },
                })
              ),
              description: schema.maybe(
                schema.string({
                  meta: { description: 'Updated description of what the agent does.' },
                })
              ),
              avatar_color: schema.maybe(
                schema.string({
                  meta: { description: 'Updated hex color code for the agent avatar.' },
                })
              ),
              avatar_symbol: schema.maybe(
                schema.string({
                  meta: { description: 'Updated symbol/initials for the agent avatar.' },
                })
              ),
              labels: schema.maybe(
                schema.arrayOf(
                  schema.string({
                    meta: { description: 'Updated label for categorizing the agent.' },
                  }),
                  {
                    meta: { description: 'Updated labels for categorizing and organizing agents.' },
                  }
                )
              ),
              configuration: schema.maybe(
                schema.object(
                  {
                    instructions: schema.maybe(
                      schema.string({
                        meta: {
                          description:
                            'Updated system instructions that define the agent behavior.',
                        },
                      })
                    ),
                    tools: schema.maybe(TOOL_SELECTION_SCHEMA),
                  },
                  {
                    meta: { description: 'Updated configuration settings for the agent.' },
                  }
                )
              ),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/agents_update.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { agents } = getInternalServices();
        const service = await agents.getRegistry({ request });
        const profile = await service.update(request.params.id, request.body);
        analyticsService?.reportAgentUpdated({
          agentId: profile.id,
          toolSelection: profile.configuration.tools,
        });
        return response.ok<UpdateAgentResponse>({ body: profile });
      })
    );

  // Delete agent
  router.versioned
    .delete({
      path: `${publicApiPath}/agents/{id}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageAgentBuilder] },
      },
      access: 'public',
      summary: 'Delete an agent',
      description: 'Delete an agent by ID. This action cannot be undone.',
      options: {
        tags: ['agent', 'oas-tag:agent builder'],
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
              id: schema.string({
                meta: { description: 'The unique identifier of the agent to delete.' },
              }),
            }),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/agents_delete.yaml'),
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { agents } = getInternalServices();
        const service = await agents.getRegistry({ request });

        const result = await service.delete({ id: request.params.id });
        return response.ok<DeleteAgentResponse>({
          body: {
            success: result,
          },
        });
      })
    );
}
