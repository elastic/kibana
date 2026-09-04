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
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { resolveIdentity } from '../core/resolve_identity';
import { recallMemory } from '../core/recall_memory';
import { tombstoneMemory } from '../core/tombstone_memory';
import { forgetInputSchema, recallInputSchema, rememberInputSchema } from '../schemas';
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
export const MEMORY_REMEMBER_STEP_ID = 'memory.remember' as const;
export const MEMORY_FORGET_STEP_ID = 'memory.forget' as const;

const RecallOutputSchema = z.object({
  memories: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      category: z.string().optional(),
      type: z.string().optional(),
      tags: z.array(z.string()).optional(),
      created_at: z.string(),
      author: z.string(),
      author_kind: z.string(),
      revision: z.number(),
      scope: z.string().optional(),
    })
  ),
});

const RememberOutputSchema = z.object({
  id: z.string().describe('The Agent Memory document ID.'),
  revision: z.number().int().describe('The revision number after this operation.'),
  action: z.enum(['created', 'updated']).describe('Whether this was a new memory or supersession.'),
});

const ForgetOutputSchema = z.object({
  result: z.enum(['deleted', 'not_found']),
});

/**
 * Registers memory recall, remember, and forget step definitions with the
 * Workflows engine. The steps use the same core functions as the agent tools.
 *
 * Identity and space are derived from the step execution context — they are
 * never accepted as step inputs (cross-user forge prevention).
 */
export const registerMemoryWorkflowSteps = (
  workflowsExtensions: WorkflowsExtensionsServerPluginSetup,
  getStorage: GetMemoryStorage,
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
      inputSchema: recallInputSchema,
      outputSchema: RecallOutputSchema,
      handler: async (context) => {
        const { query, category, tags, limit } = context.input;
        const request = context.contextManager.getFakeRequest();
        const spaceId = context.contextManager.getContext().workflow.spaceId;
        const identity = resolveIdentity({
          request,
          security: getCoreSecurity(),
        });

        if (!identity) {
          return { output: { memories: [] } };
        }

        const result = await recallMemory({
          storage: getStorage(getCurrentUserEsClient(request)),
          logger: context.logger,
          params: { query, category, tags, limit, space_id: spaceId, identity },
        });

        return { output: { memories: result.memories } };
      },
    })
  );

  // ── memory.remember ────────────────────────────────────────────────────────
  workflowsExtensions.registerStepDefinition(async () => {
    const { writeMemory } = await import('../core/write_memory');

    return createServerStepDefinition({
      id: MEMORY_REMEMBER_STEP_ID,
      category: StepCategory.Ai,
      label: 'Remember memory',
      description:
        'Stores a new memory or supersedes an existing one with identical content ' +
        '(deterministic key within the executing user scope).',
      inputSchema: rememberInputSchema,
      outputSchema: RememberOutputSchema,
      handler: async (context) => {
        const { title, description, category, tags, expires_at, scope, used_memory_ids } =
          context.input;
        const request = context.contextManager.getFakeRequest();
        const spaceId = context.contextManager.getContext().workflow.spaceId;
        const identity = resolveIdentity({
          request,
          security: getCoreSecurity(),
        });

        if (!identity) {
          throw new Error('Cannot remember memory: no user identity available for scoping.');
        }

        const esClient = getCurrentUserEsClient(request);
        const result = await writeMemory({
          storage: getStorage(esClient),
          esClient,
          params: {
            title,
            description,
            category,
            tags,
            expires_at,
            scope,
            used_memory_ids,
            call_source: 'workflow',
            space_id: spaceId,
            identity,
          },
        });

        return { output: { id: result.id, revision: result.revision, action: result.action } };
      },
    });
  });

  // ── memory.forget ──────────────────────────────────────────────────────────
  workflowsExtensions.registerStepDefinition(
    createServerStepDefinition({
      id: MEMORY_FORGET_STEP_ID,
      category: StepCategory.Ai,
      label: 'Forget memory',
      description: 'Soft-deletes a personal memory owned by the executing user.',
      inputSchema: forgetInputSchema,
      outputSchema: ForgetOutputSchema,
      handler: async (context) => {
        const { id } = context.input;
        const request = context.contextManager.getFakeRequest();
        const spaceId = context.contextManager.getContext().workflow.spaceId;
        const identity = resolveIdentity({
          request,
          security: getCoreSecurity(),
        });

        if (!identity) {
          throw new Error('Cannot forget memory: no user identity available for scoping.');
        }

        const result = await tombstoneMemory({
          storage: getStorage(getCurrentUserEsClient(request)),
          abortSignal: context.abortSignal,
          params: {
            id,
            space_id: spaceId,
            identity,
          },
        });

        return { output: result };
      },
    })
  );
};
