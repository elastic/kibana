/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { MemoryEdgeType } from '@kbn/agent-builder-common';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { internalApiPath } from '../../common/constants';
import { AGENT_BUILDER_READ_SECURITY, AGENT_BUILDER_WRITE_SECURITY } from './route_security';
import { GraphTraversalService } from '../services/memory/graph/graph_traversal';
import { ReviewQueue, reviewQueueIndexName } from '../services/memory/lifecycle/review_queue';
import {
  scheduleMemoryConsolidationTask,
  MEMORY_CONSOLIDATION_TASK_ID,
} from '../services/memory/consolidation';
import { getMemoryPreloader } from '../services/memory/preload/memory_preloader';

const MEMORY_BASE_PATH = `${internalApiPath}/memory`;

/** Valid memory type values for schema validation */
const MEMORY_TYPE_SCHEMA = schema.oneOf([
  schema.literal('semantic'),
  schema.literal('episodic'),
  schema.literal('procedural'),
]);

/** Valid memory status values for schema validation */
const MEMORY_STATUS_SCHEMA = schema.oneOf([
  schema.literal('candidate'),
  schema.literal('provisional'),
  schema.literal('established'),
  schema.literal('consolidated'),
  schema.literal('suspect'),
  schema.literal('deprecated'),
]);

/** Valid retrieval stage values for schema validation */
const RETRIEVAL_STAGE_SCHEMA = schema.oneOf([
  schema.literal('round_start'),
  schema.literal('tool_checkpoint'),
  schema.literal('final_answer'),
  schema.literal('memory_expand'),
]);

/** Valid memory edge type values for schema validation */
const EDGE_TYPE_SCHEMA = schema.oneOf([
  schema.literal('related_to'),
  schema.literal('applies_to'),
  schema.literal('derived_from'),
  schema.literal('contradicts'),
  schema.literal('same_project'),
  schema.literal('preference_cluster'),
  schema.literal('refines'),
]);

/** Memory link schema for create/update operations */
const MEMORY_LINK_SCHEMA = schema.object({
  target_id: schema.string({ meta: { description: 'Target memory node ID.' } }),
  type: EDGE_TYPE_SCHEMA,
  weight: schema.number({
    min: 0,
    max: 1,
    meta: { description: 'Relationship strength (0.0–1.0).' },
  }),
});

/** Source reference schema */
const SOURCE_REF_SCHEMA = schema.object({
  conversation_id: schema.string({
    meta: { description: 'ID of the source conversation.' },
  }),
  round_id: schema.string({ meta: { description: 'ID of the round within the conversation.' } }),
  message_ids: schema.maybe(
    schema.arrayOf(schema.string({ meta: { description: 'Optional message IDs.' } }))
  ),
});

export function registerMemoryRoutes({
  router,
  getInternalServices,
  logger,
  coreSetup,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // ---------------------------------------------------------------------------
  // Story 8.1 — Memory CRUD routes
  // ---------------------------------------------------------------------------

  // GET /internal/agent_builder/memory — list memories
  router.get(
    {
      path: MEMORY_BASE_PATH,
      validate: {
        query: schema.object({
          type: schema.maybe(MEMORY_TYPE_SCHEMA),
          status: schema.maybe(MEMORY_STATUS_SCHEMA),
          size: schema.number({ defaultValue: 20, min: 1, max: 100 }),
          from: schema.number({ defaultValue: 0, min: 0 }),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { memory } = getInternalServices();
      const client = await memory.getScopedClient({ request });
      const { type, status, size, from } = request.query;

      const memories = await client.list({
        type,
        status,
        size,
        from,
      });

      return response.ok({ body: { results: memories, total: memories.length } });
    })
  );

  // GET /internal/agent_builder/memory/:id — get single memory
  router.get(
    {
      path: `${MEMORY_BASE_PATH}/{id}`,
      validate: {
        params: schema.object({
          id: schema.string({ meta: { description: 'Memory node ID.' } }),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { memory } = getInternalServices();
      const client = await memory.getScopedClient({ request });
      const node = await client.get(request.params.id);
      return response.ok({ body: node });
    })
  );

  // POST /internal/agent_builder/memory — create memory (admin/manual)
  router.post(
    {
      path: MEMORY_BASE_PATH,
      validate: {
        body: schema.object({
          type: MEMORY_TYPE_SCHEMA,
          subtype: schema.maybe(schema.string()),
          summary: schema.string({
            minLength: 1,
            meta: { description: 'Concise one-line summary of the memory.' },
          }),
          full: schema.string({
            minLength: 1,
            meta: { description: 'Full content of the memory.' },
          }),
          confidence: schema.number({
            min: 0,
            max: 1,
            meta: { description: 'Confidence score (0.0–1.0).' },
          }),
          salience: schema.maybe(schema.number({ min: 0, max: 1 })),
          utility: schema.maybe(schema.number({ min: 0, max: 1 })),
          stability: schema.maybe(schema.number({ min: 0, max: 1 })),
          status: schema.maybe(MEMORY_STATUS_SCHEMA),
          source_refs: schema.maybe(schema.arrayOf(SOURCE_REF_SCHEMA)),
          links: schema.maybe(schema.arrayOf(MEMORY_LINK_SCHEMA)),
          space: schema.maybe(schema.string()),
          user_id: schema.maybe(schema.string()),
          user_name: schema.maybe(schema.string()),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_WRITE_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { memory } = getInternalServices();
      const client = await memory.getScopedClient({ request });

      // The scoped memory client injects space and user_name from the authenticated
      // user context (set in the client constructor). The body values are overridden
      // by the client implementation, but the type requires them — pass empty strings
      // as placeholders since they will not be used.
      const node = await client.create({
        type: request.body.type,
        subtype: request.body.subtype,
        summary: request.body.summary,
        full: request.body.full,
        confidence: request.body.confidence,
        salience: request.body.salience,
        utility: request.body.utility,
        stability: request.body.stability,
        status: request.body.status,
        source_refs: request.body.source_refs,
        links: request.body.links,
        // space and user_name are provided as required by MemoryCreateRequest type
        // but the MemoryClientImpl overrides them from its own constructor scope
        space: '',
        user_name: '',
      });

      return response.ok({ body: node });
    })
  );

  // PUT /internal/agent_builder/memory/:id — update memory
  router.put(
    {
      path: `${MEMORY_BASE_PATH}/{id}`,
      validate: {
        params: schema.object({
          id: schema.string({ meta: { description: 'Memory node ID to update.' } }),
        }),
        body: schema.object({
          summary: schema.maybe(schema.string({ minLength: 1 })),
          full: schema.maybe(schema.string({ minLength: 1 })),
          confidence: schema.maybe(schema.number({ min: 0, max: 1 })),
          salience: schema.maybe(schema.number({ min: 0, max: 1 })),
          utility: schema.maybe(schema.number({ min: 0, max: 1 })),
          stability: schema.maybe(schema.number({ min: 0, max: 1 })),
          status: schema.maybe(MEMORY_STATUS_SCHEMA),
          source_refs: schema.maybe(schema.arrayOf(SOURCE_REF_SCHEMA)),
          links: schema.maybe(schema.arrayOf(MEMORY_LINK_SCHEMA)),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_WRITE_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { memory } = getInternalServices();
      const client = await memory.getScopedClient({ request });

      const updated = await client.update({
        id: request.params.id,
        ...request.body,
      });

      return response.ok({ body: updated });
    })
  );

  // DELETE /internal/agent_builder/memory/:id — soft-delete (set status='deprecated')
  router.delete(
    {
      path: `${MEMORY_BASE_PATH}/{id}`,
      validate: {
        params: schema.object({
          id: schema.string({ meta: { description: 'Memory node ID to delete.' } }),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_WRITE_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { memory } = getInternalServices();
      const client = await memory.getScopedClient({ request });

      // Soft-delete: set status to 'deprecated' rather than hard-deleting
      await client.update({
        id: request.params.id,
        status: 'deprecated',
      });

      return response.ok({ body: { success: true, id: request.params.id } });
    })
  );

  // DELETE /internal/agent_builder/memory — delete ALL memories for the current user/space
  router.delete(
    {
      path: MEMORY_BASE_PATH,
      validate: {},
      options: { access: 'internal' },
      security: AGENT_BUILDER_WRITE_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { memory } = getInternalServices();
      const client = await memory.getScopedClient({ request });

      // Fetch all memories and hard-delete them
      let deleted = 0;
      let batch = await client.list({ size: 100 });
      while (batch.length > 0) {
        for (const node of batch) {
          await client.delete(node.id);
          deleted++;
        }
        batch = await client.list({ size: 100 });
      }

      return response.ok({ body: { success: true, deleted } });
    })
  );

  // ---------------------------------------------------------------------------
  // Story 8.2 — Memory search route
  // ---------------------------------------------------------------------------

  // POST /internal/agent_builder/memory/search — hybrid search
  router.post(
    {
      path: `${MEMORY_BASE_PATH}/search`,
      validate: {
        body: schema.object({
          query: schema.string({
            minLength: 1,
            meta: { description: 'Search query text.' },
          }),
          stage: schema.maybe(RETRIEVAL_STAGE_SCHEMA),
          limit: schema.number({ defaultValue: 10, min: 1, max: 100 }),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { memory } = getInternalServices();
      const client = await memory.getScopedClient({ request });

      const { query, stage, limit } = request.body;

      // Use the memory client's built-in search for BM25 results
      const results = await client.search(query, {
        size: limit,
        stage,
      });

      return response.ok({
        body: {
          results,
          total: results.length,
          query,
          stage: stage ?? 'round_start',
        },
      });
    })
  );

  // ---------------------------------------------------------------------------
  // Story 8.3 — Graph traversal route
  // ---------------------------------------------------------------------------

  // GET /internal/agent_builder/memory/:id/graph — graph subgraph
  router.get(
    {
      path: `${MEMORY_BASE_PATH}/{id}/graph`,
      validate: {
        params: schema.object({
          id: schema.string({ meta: { description: 'Root memory node ID.' } }),
        }),
        query: schema.object({
          depth: schema.number({ defaultValue: 2, min: 1, max: 3 }),
          edge_types: schema.maybe(
            schema.string({
              meta: {
                description: 'Comma-separated list of edge types to traverse.',
              },
            })
          ),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { memory } = getInternalServices();
      const client = await memory.getScopedClient({ request });

      const { id } = request.params;
      const { depth, edge_types: edgeTypesParam } = request.query;

      // Parse edge_types query param: "related_to,contradicts" -> ['related_to', 'contradicts']
      let edgeTypes: MemoryEdgeType[] | undefined;
      if (edgeTypesParam) {
        edgeTypes = edgeTypesParam
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean) as MemoryEdgeType[];
      }

      const graphService = new GraphTraversalService({ client, logger });
      const subgraph = await graphService.getSubgraph(id, depth, edgeTypes);

      return response.ok({
        body: {
          nodes: subgraph.nodes,
          edges: subgraph.edges,
        },
      });
    })
  );

  // ---------------------------------------------------------------------------
  // Story 8.4 — Admin routes
  // ---------------------------------------------------------------------------

  // POST /internal/agent_builder/memory/consolidate — trigger manual consolidation
  router.post(
    {
      path: `${MEMORY_BASE_PATH}/consolidate`,
      validate: false,
      options: { access: 'internal' },
      security: AGENT_BUILDER_WRITE_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const [, pluginDeps] = await coreSetup.getStartServices();
      const { taskManager } = pluginDeps;

      try {
        // Run the consolidation task soon (manual trigger)
        await taskManager.runSoon(MEMORY_CONSOLIDATION_TASK_ID);
        return response.ok({ body: { success: true, task_id: MEMORY_CONSOLIDATION_TASK_ID } });
      } catch (err) {
        // If the task doesn't exist yet, schedule it first then inform caller
        logger.warn(
          `Memory consolidation trigger failed (may not be scheduled yet): ${
            (err as Error).message
          }`
        );

        await scheduleMemoryConsolidationTask({
          taskManager,
          logger,
        });

        return response.ok({
          body: {
            success: true,
            task_id: MEMORY_CONSOLIDATION_TASK_ID,
            message: 'Consolidation task scheduled and will run at next interval',
          },
        });
      }
    })
  );

  // GET /internal/agent_builder/memory/stats — counts by type/status
  router.get(
    {
      path: `${MEMORY_BASE_PATH}/stats`,
      validate: false,
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { memory } = getInternalServices();
      const client = await memory.getScopedClient({ request });

      // Fetch all memories (with a high size limit for stats computation)
      const allMemories = await client.list({ size: 10000 });

      // Compute counts by type
      const byType: Record<string, number> = {};
      const byStatus: Record<string, number> = {};

      for (const mem of allMemories) {
        byType[mem.type] = (byType[mem.type] ?? 0) + 1;
        byStatus[mem.status] = (byStatus[mem.status] ?? 0) + 1;
      }

      return response.ok({
        body: {
          total: allMemories.length,
          by_type: byType,
          by_status: byStatus,
        },
      });
    })
  );

  // GET /internal/agent_builder/memory/review_queue — list review queue items
  router.get(
    {
      path: `${MEMORY_BASE_PATH}/review_queue`,
      validate: {
        query: schema.object({
          limit: schema.number({ defaultValue: 20, min: 1, max: 100 }),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const [coreStart] = await coreSetup.getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser;

      const reviewQueue = new ReviewQueue({ logger, esClient });

      // Peek at the queue without dequeueing (list mode)
      // We use a search instead of dequeue to not consume items
      const { limit } = request.query;
      const size = await reviewQueue.size();

      // To list without consuming, we do a direct search on the index
      // (ReviewQueue.dequeue removes items, so we peek manually)
      const response2 = await esClient.search({
        index: reviewQueueIndexName,
        size: limit,
        sort: [{ priority: { order: 'desc' } }, { enqueued_at: { order: 'asc' } }],
        query: { match_all: {} },
      });

      const items = response2.hits.hits.map((hit) => ({
        id: hit._id,
        ...(hit._source as object),
      }));

      return response.ok({
        body: {
          items,
          total: size,
        },
      });
    })
  );

  // POST /internal/agent_builder/memory/review/:id — resolve review item
  router.post(
    {
      path: `${MEMORY_BASE_PATH}/review/{id}`,
      validate: {
        params: schema.object({
          id: schema.string({ meta: { description: 'Review queue item ID.' } }),
        }),
        body: schema.object({
          action: schema.oneOf(
            [schema.literal('approve'), schema.literal('reject'), schema.literal('merge')],
            {
              meta: {
                description: 'Action to take: approve keeps the memory, reject deprecates it.',
              },
            }
          ),
          merge_target_id: schema.maybe(
            schema.string({
              meta: { description: 'Target memory ID to merge into (required when action=merge).' },
            })
          ),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_WRITE_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const [coreStart] = await coreSetup.getStartServices();
      const esClient = coreStart.elasticsearch.client.asInternalUser;
      const { memory } = getInternalServices();
      const memoryClient = await memory.getScopedClient({ request });

      const { id } = request.params;
      const { action, merge_target_id: mergeTargetId } = request.body;

      // Fetch the review item to get the memory_id
      const itemResponse = await esClient.get({
        index: reviewQueueIndexName,
        id,
      });

      if (!itemResponse.found) {
        return response.notFound({
          body: { message: `Review item ${id} not found` },
        });
      }

      const reviewItem = itemResponse._source as { memory_id: string };
      const { memory_id: memoryId } = reviewItem;

      // Process the action
      if (action === 'approve') {
        // Promote the memory to provisional if it was a candidate
        const node = await memoryClient.get(memoryId);
        if (node.status === 'candidate') {
          await memoryClient.update({ id: memoryId, status: 'provisional' });
        }
      } else if (action === 'reject') {
        // Soft-delete: deprecate the memory
        await memoryClient.update({ id: memoryId, status: 'deprecated' });
      } else if (action === 'merge') {
        if (!mergeTargetId) {
          return response.badRequest({
            body: { message: 'merge_target_id is required when action=merge' },
          });
        }
        // Deprecate the reviewed memory (merged into target)
        await memoryClient.update({ id: memoryId, status: 'deprecated' });
      }

      // Remove the review item from the queue
      await esClient.delete({
        index: reviewQueueIndexName,
        id,
        refresh: true,
      });

      return response.ok({
        body: {
          success: true,
          action,
          memory_id: memoryId,
          review_item_id: id,
        },
      });
    })
  );

  // POST /internal/agent_builder/memory/preload — preload memories for the current user
  router.post(
    {
      path: `${MEMORY_BASE_PATH}/preload`,
      validate: {},
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const preloader = getMemoryPreloader();
      if (!preloader) {
        return response.ok({ body: { preloaded: 0, message: 'Preloader not initialized' } });
      }

      const { memory } = getInternalServices();
      const memoryClient = await memory.getScopedClient({ request });

      // Extract username from scoped client context
      const userName = request.headers?.['x-forwarded-user'] as string ?? 'unknown';

      await preloader.preload(memoryClient, userName);
      const memories = preloader.get(userName);

      return response.ok({
        body: { preloaded: memories.length },
      });
    })
  );
}
