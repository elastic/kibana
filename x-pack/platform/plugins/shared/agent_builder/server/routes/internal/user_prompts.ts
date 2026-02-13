/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { createBadRequestError } from '@kbn/agent-builder-common';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type {
  FindUserPromptsResponse,
  GetUserPromptResponse,
  CreateUserPromptResponse,
  UpdateUserPromptResponse,
  DeleteUserPromptResponse,
  BulkDeleteUserPromptsResponse,
  BulkDeleteUserPromptResult,
} from '../../../common/http_api/user_prompts';
import { apiPrivileges } from '../../../common/features';
import { internalApiPath } from '../../../common/constants';
import { createClient } from '../../services/user_prompts';

export function registerInternalUserPromptsRoutes({
  router,
  coreSetup,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // Find user prompts with search and pagination
  router.get(
    {
      path: `${internalApiPath}/user_prompts/_find`,
      validate: {
        query: schema.object({
          query: schema.maybe(schema.string()),
          page: schema.number({ defaultValue: 1, min: 1 }),
          per_page: schema.number({ defaultValue: 20, min: 1, max: 1000 }),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const [coreStart] = await coreSetup.getStartServices();
      const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
      const authUser = coreStart.security.authc.getCurrentUser(request);

      if (!authUser) {
        throw createBadRequestError('No user bound to the provided request');
      }

      const space = (await ctx.agentBuilder).spaces.getSpaceId();
      const { query, page, per_page: perPage } = request.query;

      const client = createClient({
        space,
        username: authUser.username,
        logger,
        esClient,
      });

      const result = await client.find({ query, page, perPage });

      return response.ok<FindUserPromptsResponse>({
        body: {
          page: result.page,
          per_page: result.perPage,
          total: result.total,
          data: result.data,
        },
      });
    })
  );

  // Get user prompt by ID
  router.get(
    {
      path: `${internalApiPath}/user_prompts/{prompt_id}`,
      validate: {
        params: schema.object({
          prompt_id: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const [coreStart] = await coreSetup.getStartServices();
      const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
      const authUser = coreStart.security.authc.getCurrentUser(request);

      if (!authUser) {
        throw createBadRequestError('No user bound to the provided request');
      }

      const space = (await ctx.agentBuilder).spaces.getSpaceId();
      const { prompt_id: promptId } = request.params;

      const client = createClient({
        space,
        username: authUser.username,
        logger,
        esClient,
      });

      const prompt = await client.get(promptId);

      return response.ok<GetUserPromptResponse>({
        body: prompt,
      });
    })
  );

  // Create user prompt
  router.post(
    {
      path: `${internalApiPath}/user_prompts`,
      validate: {
        body: schema.object({
          id: schema.string(),
          name: schema.string(),
          content: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const [coreStart] = await coreSetup.getStartServices();
      const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
      const authUser = coreStart.security.authc.getCurrentUser(request);

      if (!authUser) {
        throw createBadRequestError('No user bound to the provided request');
      }

      const space = (await ctx.agentBuilder).spaces.getSpaceId();

      const client = createClient({
        space,
        username: authUser.username,
        logger,
        esClient,
      });

      const prompt = await client.create(request.body);

      return response.ok<CreateUserPromptResponse>({
        body: prompt,
      });
    })
  );

  // Update user prompt
  router.put(
    {
      path: `${internalApiPath}/user_prompts/{prompt_id}`,
      validate: {
        params: schema.object({
          prompt_id: schema.string(),
        }),
        body: schema.object({
          name: schema.maybe(schema.string()),
          content: schema.maybe(schema.string()),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const [coreStart] = await coreSetup.getStartServices();
      const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
      const authUser = coreStart.security.authc.getCurrentUser(request);

      if (!authUser) {
        throw createBadRequestError('No user bound to the provided request');
      }

      const space = (await ctx.agentBuilder).spaces.getSpaceId();
      const { prompt_id: promptId } = request.params;

      const client = createClient({
        space,
        username: authUser.username,
        logger,
        esClient,
      });

      const prompt = await client.update(promptId, request.body);

      return response.ok<UpdateUserPromptResponse>({
        body: prompt,
      });
    })
  );

  // Delete user prompt
  router.delete(
    {
      path: `${internalApiPath}/user_prompts/{prompt_id}`,
      validate: {
        params: schema.object({
          prompt_id: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const [coreStart] = await coreSetup.getStartServices();
      const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
      const authUser = coreStart.security.authc.getCurrentUser(request);

      if (!authUser) {
        throw createBadRequestError('No user bound to the provided request');
      }

      const space = (await ctx.agentBuilder).spaces.getSpaceId();
      const { prompt_id: promptId } = request.params;

      const client = createClient({
        space,
        username: authUser.username,
        logger,
        esClient,
      });

      await client.delete(promptId);

      return response.ok<DeleteUserPromptResponse>({
        body: {
          success: true,
        },
      });
    })
  );

  // Bulk delete user prompts
  router.post(
    {
      path: `${internalApiPath}/user_prompts/_bulk_delete`,
      validate: {
        body: schema.object({
          ids: schema.arrayOf(schema.string()),
        }),
      },
      options: { access: 'internal' },
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageAgentBuilder] },
      },
    },
    wrapHandler(async (ctx, request, response) => {
      const [coreStart] = await coreSetup.getStartServices();
      const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
      const authUser = coreStart.security.authc.getCurrentUser(request);

      if (!authUser) {
        throw createBadRequestError('No user bound to the provided request');
      }

      const space = (await ctx.agentBuilder).spaces.getSpaceId();
      const { ids } = request.body;

      const client = createClient({
        space,
        username: authUser.username,
        logger,
        esClient,
      });

      const deleteResults = await Promise.allSettled(ids.map((id) => client.delete(id)));

      const results: BulkDeleteUserPromptResult[] = deleteResults.map((result, index) => {
        if (result.status !== 'fulfilled') {
          return {
            promptId: ids[index],
            success: false,
            reason: result.reason.toJSON?.() ?? {
              error: { message: 'Unknown error' },
            },
          };
        }

        return {
          promptId: ids[index],
          success: true,
        };
      });

      return response.ok<BulkDeleteUserPromptsResponse>({
        body: {
          results,
        },
      });
    })
  );
}
