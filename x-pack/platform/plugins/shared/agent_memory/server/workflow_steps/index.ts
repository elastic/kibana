/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { MemoryStorage } from '../storage/memory_storage';
import { recallMemory } from '../core/recall_memory';

/**
 * Workflow step type IDs for agent memory operations.
 *
 * These are registered via `workflowsExtensions.registerStepDefinition` in setup().
 * They share the same core functions (`recallMemory` / `writeMemory`) as the
 * registered agent tools, ensuring consistent behaviour in both execution contexts.
 *
 * NOTE: Each step requires an approval hash file at:
 *   src/platform/plugins/shared/workflows_extensions/test/scout/api/fixtures/
 *   approved_step_definitions/<step.id>.txt
 * Generate the hash by running the approval test and following the fix instructions.
 *
 * @see https://github.com/elastic/kibana/issues/265012 (approval test currently skipped)
 */
export const MEMORY_RECALL_STEP_ID = 'memory.recall' as const;
export const MEMORY_RETAIN_STEP_ID = 'memory.retain' as const;

// ── Recall step ────────────────────────────────────────────────────────────────

const RecallInputSchema = z.object({
  query: z.string().max(2000).describe('The query text used to retrieve relevant memories.'),
  category: z
    .enum(['profile', 'preferences', 'entities', 'events', 'trajectories'])
    .optional()
    .describe('Limit results to this memory category.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe('Maximum number of memories to return.'),
  space_id: z.string().max(256).describe('Kibana space to scope the recall query to.'),
  author: z
    .string()
    .max(512)
    .describe('Identity key of the user whose memories to recall.'),
  author_kind: z.enum(['profile_uid', 'username']).describe('Discriminator for the author field.'),
});

const RecallOutputSchema = z.object({
  memories: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      category: z.string().optional(),
      type: z.string().optional(),
      created_at: z.string(),
      origin: z.string().optional(),
      assurance: z.string().optional(),
      author: z.string(),
      revision: z.number(),
    })
  ),
});

// ── Retain step ───────────────────────────────────────────────────────────────

const RetainInputSchema = z.object({
  title: z.string().max(500).describe('Short label for the memory.'),
  description: z.string().max(10000).describe('Full content of the memory to store.'),
  category: z
    .enum(['profile', 'preferences', 'entities', 'events', 'trajectories'])
    .optional()
    .describe('Memory category.'),
  type: z
    .enum(['episodic', 'semantic', 'procedural'])
    .optional()
    .describe('Memory type.'),
  tags: z.array(z.string().max(100)).max(20).optional().describe('Optional classification tags.'),
  space_id: z.string().max(256).describe('Kibana space to store the memory in.'),
  author: z.string().max(512).describe('Identity key of the user this memory belongs to.'),
  author_kind: z.enum(['profile_uid', 'username']).describe('Discriminator for the author field.'),
});

const RetainOutputSchema = z.object({
  id: z.string().describe('The agent-memory document id.'),
  revision: z.number().int().describe('The revision number after this operation.'),
  action: z.enum(['created', 'updated']).describe('Whether this was a new memory or supersession.'),
});

/**
 * Registers `memory.recall` and `memory.retain` step definitions with the
 * Workflows engine. Both steps use the same core functions as the agent tools.
 */
export const registerMemoryWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  getStorage: () => MemoryStorage
): void => {
  // ── memory.recall ──────────────────────────────────────────────────────────
  workflowsExtensions.registerStepDefinition(
    createServerStepDefinition({
      id: MEMORY_RECALL_STEP_ID,
      category: StepCategory.Ai,
      label: 'Recall memories',
      description: 'Retrieves relevant memories for a user in a given Kibana space using RRF.',
      inputSchema: RecallInputSchema,
      outputSchema: RecallOutputSchema,
      handler: async (context) => {
        const { query, category, limit, space_id, author, author_kind } = context.input;
        const storage = getStorage();

        const result = await recallMemory({
          storage,
          params: {
            query,
            category,
            limit,
            space_id,
            identity: { author, author_kind },
          },
        });

        return { output: { memories: result.memories } };
      },
    })
  );

  // ── memory.retain ──────────────────────────────────────────────────────────
  workflowsExtensions.registerStepDefinition(
    // Loaded lazily so the async import of write_memory only fires when the step is used.
    async () => {
      const { writeMemory } = await import('../core/write_memory');
      const { DataStreamClient } = await import('@kbn/data-streams');
      const { agentMemoryHistoryStream } = await import('../storage/history_stream');

      return createServerStepDefinition({
        id: MEMORY_RETAIN_STEP_ID,
        category: StepCategory.Ai,
        label: 'Retain memory',
        description:
          'Stores a new memory or supersedes an existing one with identical content (find-or-create on content hash).',
        inputSchema: RetainInputSchema,
        outputSchema: RetainOutputSchema,
        handler: async (context) => {
          const { title, description, category, type, tags, space_id, author, author_kind } =
            context.input;
          const storage = getStorage();
          const esClient = context.contextManager.getScopedEsClient();

          const historyClient = DataStreamClient.fromDefinition({
            dataStream: agentMemoryHistoryStream,
            elasticsearchClient: esClient,
          });

          const result = await writeMemory({
            storage,
            historyClient,
            params: {
              title,
              description,
              category,
              type,
              tags,
              space_id,
              identity: { author, author_kind },
            },
          });

          return {
            output: {
              id: result.id,
              revision: result.revision,
              action: result.action,
            },
          };
        },
      });
    }
  );
};
