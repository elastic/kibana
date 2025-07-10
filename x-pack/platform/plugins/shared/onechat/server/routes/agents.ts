/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { apiPrivileges } from '../../common/features';
import type {
  GetAgentResponse,
  CreateAgentResponse,
  UpdateAgentResponse,
  DeleteAgentResponse,
  ListAgentResponse,
} from '../../common/http_api/agents';
import { getTechnicalPreviewWarning } from './utils';

const TECHNICAL_PREVIEW_WARNING = getTechnicalPreviewWarning('Elastic Agent API');

const TOOL_SELECTION_SCHEMA = schema.arrayOf(
  schema.object({
    type: schema.maybe(schema.string()),
    tool_ids: schema.arrayOf(schema.string()),
  })
);

export function registerAgentRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // List agents
  router.versioned
    .get({
      path: '/api/chat/agents',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'List agents',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        tags: ['agent'],
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
        const { agents: agentsService } = getInternalServices();
        const service = await agentsService.getScopedClient({ request });
        const agents = await service.list();
        return response.ok<ListAgentResponse>({ body: { results: agents } });
      })
    );

  // Get agent by id
  router.versioned
    .get({
      path: '/api/chat/agents/{id}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'Get an agent',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        tags: ['agent'],
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { params: schema.object({ id: schema.string() }) },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { agents } = getInternalServices();
        const service = await agents.getScopedClient({ request });

        const profile = await service.get(request.params.id);
        return response.ok<GetAgentResponse>({ body: profile });
      })
    );

  // Create agent
  router.versioned
    .post({
      path: '/api/chat/agents',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
      access: 'public',
      summary: 'Create an agent',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        tags: ['agent'],
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
              name: schema.string(),
              description: schema.string(),
              configuration: schema.object({
                instructions: schema.maybe(schema.string()),
                tools: TOOL_SELECTION_SCHEMA,
              }),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { agents } = getInternalServices();
        const service = await agents.getScopedClient({ request });
        const profile = await service.create(request.body);
        return response.ok<CreateAgentResponse>({ body: profile });
      })
    );

  // Update agent
  router.versioned
    .put({
      path: '/api/chat/agents/{id}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
      access: 'public',
      summary: 'Update an agent',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        tags: ['agent'],
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
            params: schema.object({ id: schema.string() }),
            body: schema.object({
              name: schema.maybe(schema.string()),
              description: schema.maybe(schema.string()),
              configuration: schema.maybe(
                schema.object({
                  instructions: schema.maybe(schema.string()),
                  tools: schema.maybe(TOOL_SELECTION_SCHEMA),
                })
              ),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { agents } = getInternalServices();
        const service = await agents.getScopedClient({ request });
        const profile = await service.update(request.params.id, request.body);
        return response.ok<UpdateAgentResponse>({ body: profile });
      })
    );

  // Delete agent
  router.versioned
    .delete({
      path: '/api/chat/agents/{id}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
      access: 'public',
      summary: 'Delete an agent',
      description: TECHNICAL_PREVIEW_WARNING,
      options: {
        tags: ['agent'],
        availability: {
          stability: 'experimental',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: { params: schema.object({ id: schema.string() }) },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { agents } = getInternalServices();
        const service = await agents.getScopedClient({ request });

        const result = await service.delete({ id: request.params.id });
        return response.ok<DeleteAgentResponse>({
          body: {
            success: result,
          },
        });
      })
    );
}
