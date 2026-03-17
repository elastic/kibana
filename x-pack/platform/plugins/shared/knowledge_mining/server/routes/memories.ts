/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '.';

const BASE_PATH = '/api/knowledge_mining/memories';

export const registerMemoryRoutes = ({ router, getServices }: RouteDependencies) => {
  // List / search memories
  router.get(
    {
      path: BASE_PATH,
      security: {
        authz: { enabled: false, reason: 'Relies on ES document-level security' },
      },
      validate: {
        query: schema.object({
          query: schema.maybe(schema.string()),
          memory_type: schema.maybe(schema.string()),
          tags: schema.maybe(schema.string()),
          directory: schema.maybe(schema.string()),
          limit: schema.maybe(schema.number({ min: 1, max: 1000 })),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const { memoryService } = getServices();
        const client = memoryService.getScopedClient({ request });
        const { query, memory_type: memoryType, tags, directory, limit } = request.query;

        let results;
        if (query) {
          results = await client.search(query, {
            memory_type: memoryType as any,
            tags: tags ? tags.split(',') : undefined,
            limit,
          });
        } else {
          results = await client.list({
            memory_type: memoryType as any,
            tags: tags ? tags.split(',') : undefined,
            directory,
            limit,
          });
        }

        return response.ok({ body: { results } });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: { message: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
    }
  );

  // Get memory by ID
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
        const { memoryService } = getServices();
        const client = memoryService.getScopedClient({ request });
        const memory = await client.get(request.params.id);
        return response.ok({ body: memory });
      } catch (error) {
        return response.customError({
          statusCode: 404,
          body: { message: error instanceof Error ? error.message : 'Not found' },
        });
      }
    }
  );

  // Create memory
  router.post(
    {
      path: BASE_PATH,
      security: {
        authz: { enabled: false, reason: 'Relies on ES document-level security' },
      },
      validate: {
        body: schema.object({
          path: schema.string(),
          title: schema.string(),
          content: schema.string(),
          memory_type: schema.string(),
          tags: schema.maybe(schema.arrayOf(schema.string())),
          source_conversation_ids: schema.maybe(schema.arrayOf(schema.string())),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const { memoryService } = getServices();
        const client = memoryService.getScopedClient({ request });
        const memory = await client.create(request.body as any);
        return response.ok({ body: memory });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: { message: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
    }
  );

  // Update memory
  router.put(
    {
      path: `${BASE_PATH}/{id}`,
      security: {
        authz: { enabled: false, reason: 'Relies on ES document-level security' },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          title: schema.maybe(schema.string()),
          content: schema.maybe(schema.string()),
          memory_type: schema.maybe(schema.string()),
          tags: schema.maybe(schema.arrayOf(schema.string())),
          path: schema.maybe(schema.string()),
        }),
      },
    },
    async (ctx, request, response) => {
      try {
        const { memoryService } = getServices();
        const client = memoryService.getScopedClient({ request });
        const memory = await client.update(request.params.id, request.body as any);
        return response.ok({ body: memory });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: { message: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
    }
  );

  // Delete memory
  router.delete(
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
        const { memoryService } = getServices();
        const client = memoryService.getScopedClient({ request });
        const deleted = await client.delete(request.params.id);
        return response.ok({ body: { deleted } });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: { message: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
    }
  );
};
