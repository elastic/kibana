/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { DataStreamClient } from '@kbn/data-streams';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { agentMemoryHistoryMappings } from '../storage/history_stream';
import { recallMemory } from '../core/recall_memory';
import { resolveIdentity } from '../core/resolve_identity';
import { AGENT_MEMORY_API_PRIVILEGES } from '../features';
import type { GetMemoryStorage } from '../types';

/**
 * Workflow step type IDs for agent memory operations.
 *
 * These are registered via `workflowsExtensions.registerStepDefinition` in setup().
 * They share the same core functions (`recallMemory` / `writeMemory`) as the
 * registered agent tools, ensuring consistent behaviour in both execution contexts.
 *
 * Identity (author, space_id) is derived from the step's execution context rather
 * than accepted as step inputs — accepting identity as free-form input would allow
 * any workflow author to read or forge memories belonging to another user.
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
  type: z.enum(['episodic', 'semantic', 'procedural']).optional().describe('Memory type.'),
  tags: z.array(z.string().max(100)).max(20).optional().describe('Optional classification tags.'),
});

const RetainOutputSchema = z.object({
  id: z.string().describe('The Agent Memory document ID.'),
  revision: z.number().int().describe('The revision number after this operation.'),
  action: z.enum(['created', 'updated']).describe('Whether this was a new memory or supersession.'),
});

/**
 * Registers `memory.recall` and `memory.retain` step definitions with the
 * Workflows engine. Both steps use the same core functions as the agent tools.
 *
 * Identity and space are derived from the step execution context — they are
 * never accepted as step inputs (cross-user forge prevention).
 */
export const registerMemoryWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  getStorage: GetMemoryStorage,
  getHistoryClient: () => DataStreamClient<typeof agentMemoryHistoryMappings>,
  getSecurityStart: () => SecurityPluginStart,
  getCoreSecurity: () => SecurityServiceStart,
  getCurrentUserEsClient: (request: KibanaRequest) => ElasticsearchClient
): void => {
  // ── memory.recall ──────────────────────────────────────────────────────────
  workflowsExtensions.registerStepDefinition(
    createServerStepDefinition({
      id: MEMORY_RECALL_STEP_ID,
      category: StepCategory.Ai,
      label: 'Recall memories',
      description: 'Retrieves relevant memories for the executing user using RRF.',
      inputSchema: RecallInputSchema,
      outputSchema: RecallOutputSchema,
      handler: async (context) => {
        const { query, category, limit } = context.input;
        const security = getSecurityStart();
        const request = context.contextManager.getFakeRequest();
        const spaceId = context.contextManager.getContext().workflow.spaceId;

        // ── Authz gate ──────────────────────────────────────────────────────
        const { hasAllRequested } = await security.authz
          .checkPrivilegesWithRequest(request)
          .atSpace(spaceId, {
            kibana: [security.authz.actions.api.get(AGENT_MEMORY_API_PRIVILEGES.read)],
          });

        if (!hasAllRequested) {
          return { output: { memories: [] } };
        }

        const identity = resolveIdentity({ request, security: getCoreSecurity() });
        if (!identity) {
          return { output: { memories: [] } };
        }

        const result = await recallMemory({
          storage: getStorage(getCurrentUserEsClient(request)),
          params: { query, category, limit, space_id: spaceId, identity },
        });

        return { output: { memories: result.memories } };
      },
    })
  );

  // ── memory.retain ──────────────────────────────────────────────────────────
  workflowsExtensions.registerStepDefinition(async () => {
    const { writeMemory } = await import('../core/write_memory');

    return createServerStepDefinition({
      id: MEMORY_RETAIN_STEP_ID,
      category: StepCategory.Ai,
      label: 'Retain memory',
      description:
        'Stores a new memory or supersedes an existing one with identical content ' +
        '(find-or-create on content hash). Writes as the executing user.',
      inputSchema: RetainInputSchema,
      outputSchema: RetainOutputSchema,
      handler: async (context) => {
        const { title, description, category, type, tags } = context.input;
        const security = getSecurityStart();
        const request = context.contextManager.getFakeRequest();
        const spaceId = context.contextManager.getContext().workflow.spaceId;

        // ── Authz gate ────────────────────────────────────────────────────
        const { hasAllRequested } = await security.authz
          .checkPrivilegesWithRequest(request)
          .atSpace(spaceId, {
            kibana: [security.authz.actions.api.get(AGENT_MEMORY_API_PRIVILEGES.write)],
          });

        if (!hasAllRequested) {
          throw new Error(
            'Forbidden: the executing user does not have the write_agent_memory privilege.'
          );
        }

        const identity = resolveIdentity({ request, security: getCoreSecurity() });
        if (!identity) {
          throw new Error('Cannot retain memory: no user identity available for scoping.');
        }

        const result = await writeMemory({
          storage: getStorage(getCurrentUserEsClient(request)),
          historyClient: getHistoryClient(),
          params: { title, description, category, type, tags, space_id: spaceId, identity },
        });

        return { output: { id: result.id, revision: result.revision, action: result.action } };
      },
    });
  });
};
