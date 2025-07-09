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
  GetAgentProfileResponse,
  CreateAgentProfileResponse,
  UpdateAgentProfileResponse,
  DeleteAgentProfileResponse,
  ListAgentProfilesResponse,
} from '../../common/http_api/agent_profiles';
import { getTechnicalPreviewWarning } from './utils';

const TECHNICAL_PREVIEW_WARNING = getTechnicalPreviewWarning('Elastic Agent API');

const TOOL_SELECTION_SCHEMA = schema.arrayOf(
  schema.object({
    provider: schema.maybe(schema.string()),
    toolIds: schema.arrayOf(schema.string()),
  })
);

export function registerAgentProfileRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // List agent profiles
  router.versioned
    .get({
      path: '/api/chat/agents/profiles',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'List agent profiles',
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
        const { agents } = getInternalServices();
        const service = await agents.getProfileService(request);
        const agentProfiles = await service.list();
        return response.ok<ListAgentProfilesResponse>({ body: { agentProfiles } });
      })
    );

  // Get agent profile by id
  router.versioned
    .get({
      path: '/api/chat/agents/profiles/{id}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readOnechat] },
      },
      access: 'public',
      summary: 'Get an agent profile',
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
        const service = await agents.getProfileService(request);

        const profile = await service.get(request.params.id);
        return response.ok<GetAgentProfileResponse>({ body: profile });
      })
    );

  // Create agent profile
  router.versioned
    .post({
      path: '/api/chat/agents/profiles',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
      access: 'public',
      summary: 'Create an agent profile',
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
              customInstructions: schema.string(),
              toolSelection: TOOL_SELECTION_SCHEMA,
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { agents } = getInternalServices();
        const service = await agents.getProfileService(request);
        const profile = await service.create(request.body);
        return response.ok<CreateAgentProfileResponse>({ body: profile });
      })
    );

  // Update agent profile
  router.versioned
    .put({
      path: '/api/chat/agents/profiles/{id}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
      access: 'public',
      summary: 'Update an agent profile',
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
              customInstructions: schema.maybe(schema.string()),
              toolSelection: schema.maybe(TOOL_SELECTION_SCHEMA),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { agents } = getInternalServices();
        const service = await agents.getProfileService(request);
        const update = { id: request.params.id, ...request.body };
        const profile = await service.update(update);
        return response.ok<UpdateAgentProfileResponse>({ body: profile });
      })
    );

  // Delete agent profile
  router.versioned
    .delete({
      path: '/api/chat/agents/profiles/{id}',
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageOnechat] },
      },
      access: 'public',
      summary: 'Delete an agent profile',
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
        const service = await agents.getProfileService(request);

        const result = await service.delete({ id: request.params.id });
        return response.ok<DeleteAgentProfileResponse>({
          body: {
            success: result,
          },
        });
      })
    );
}
