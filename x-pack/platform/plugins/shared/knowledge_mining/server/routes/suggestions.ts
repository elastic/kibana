/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '.';

const BASE_PATH = '/api/knowledge_mining/suggestions';

export const registerSuggestionRoutes = ({ router, getServices }: RouteDependencies) => {
  // List suggestions
  router.get(
    {
      path: BASE_PATH,
      security: {
        authz: { enabled: false, reason: 'Relies on ES document-level security' },
      },
      validate: {
        query: schema.object({
          status: schema.maybe(schema.string()),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const { suggestionService } = getServices();
        const client = suggestionService.getScopedClient({ request });
        const results = await client.list({
          status: request.query.status as any,
        });
        return response.ok({ body: { results } });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: { message: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
    }
  );

  // Get suggestion by ID
  router.get(
    {
      path: `${BASE_PATH}/{id}`,
      security: {
        authz: { enabled: false, reason: 'Relies on ES document-level security' },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const { suggestionService } = getServices();
        const client = suggestionService.getScopedClient({ request });
        const suggestion = await client.get(request.params.id);
        return response.ok({ body: suggestion });
      } catch (error) {
        return response.customError({
          statusCode: 404,
          body: { message: error instanceof Error ? error.message : 'Not found' },
        });
      }
    }
  );

  // Approve suggestion
  router.post(
    {
      path: `${BASE_PATH}/{id}/approve`,
      security: {
        authz: { enabled: false, reason: 'Relies on ES document-level security' },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const { suggestionService } = getServices();
        const client = suggestionService.getScopedClient({ request });
        const suggestion = await client.approve(request.params.id);
        return response.ok({ body: suggestion });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: { message: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
    }
  );

  // Reject suggestion
  router.post(
    {
      path: `${BASE_PATH}/{id}/reject`,
      security: {
        authz: { enabled: false, reason: 'Relies on ES document-level security' },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const { suggestionService } = getServices();
        const client = suggestionService.getScopedClient({ request });
        const suggestion = await client.reject(request.params.id);
        return response.ok({ body: suggestion });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: { message: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
    }
  );

  // Bulk approve/reject
  router.post(
    {
      path: `${BASE_PATH}/bulk`,
      security: {
        authz: { enabled: false, reason: 'Relies on ES document-level security' },
      },
      validate: {
        body: schema.object({
          ids: schema.arrayOf(schema.string()),
          action: schema.oneOf([schema.literal('approve'), schema.literal('reject')]),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const { suggestionService } = getServices();
        const client = suggestionService.getScopedClient({ request });
        const { ids, action } = request.body;

        if (action === 'approve') {
          await client.bulkApprove(ids);
        } else {
          await client.bulkReject(ids);
        }

        return response.ok({ body: { success: true } });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: { message: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
    }
  );
};
