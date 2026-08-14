/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { platformMemoryTools } from '@kbn/agent-builder-common/tools';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { resolveIdentity } from '../core/resolve_identity';
import { recallMemory } from '../core/recall_memory';
import { AGENT_MEMORY_API_PRIVILEGES } from '../features';
import type { GetMemoryStorage } from '../types';

const recallSchema = z.object({
  query: z.string().max(2000).describe('The query text used to retrieve relevant memories.'),
  category: z
    .enum(['profile', 'preferences', 'entities', 'events', 'trajectories'])
    .optional()
    .describe('Optional category filter. Omit to search across all categories.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe('Maximum number of memories to return. Default 10.'),
  // token_budget is reserved for Phase 2 token budgeting (D3).
  // Declared here so the interface remains stable without a breaking change.
  token_budget: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Reserved for Phase 2 (token budgeting). Has no effect in Phase 1.'),
});

/**
 * Creates the `platform.memory.recall` registered tool.
 *
 * Uses `asCurrentUser` for storage access because Agent Memory is user data,
 * so `kibana_system` is unauthorized. Data isolation is enforced via
 * mandatory `space_id + author` filters in `buildRetriever` (G3). Gated by
 * `read_agent_memory` checked via `checkPrivilegesWithRequest` before any ES
 * call. Recall **fails open**: ES errors return empty results rather than
 * propagating to the agent (D-security, G5).
 */
export const createRecallTool = ({
  getStorage,
  getSecurityStart,
  getCoreSecurity,
}: {
  getStorage: GetMemoryStorage;
  getSecurityStart: () => SecurityPluginStart;
  getCoreSecurity: () => SecurityServiceStart;
}): BuiltinToolDefinition<typeof recallSchema> => ({
  id: platformMemoryTools.recall,
  type: ToolType.builtin,
  description: `
Retrieve memories relevant to the current context for the authenticated user.

Returns a ranked list of memories (title, description, category, created date).
The result is a snapshot of what has been remembered; it does NOT reflect real-time data.

Use this tool to:
- Recall user preferences, profile information, or prior context
- Retrieve relevant facts from past conversations
- Ground the response in remembered context without issuing additional searches

Fails open: if the memory service is unavailable, returns an empty list without error.
  `.trim(),
  schema: recallSchema,
  tags: [],
  annotations: {
    title: 'Recall Memories',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ query, category, limit }, context) => {
    const security = getSecurityStart();

    // ── Authz gate: must have read_agent_memory before any ES call ────────────
    const { hasAllRequested } = await security.authz
      .checkPrivilegesWithRequest(context.request)
      .atSpace(context.spaceId, {
        kibana: [security.authz.actions.api.get(AGENT_MEMORY_API_PRIVILEGES.read)],
      });

    if (!hasAllRequested) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: { memories: [], note: 'Insufficient privileges to recall memories.' },
          },
        ],
      };
    }

    // ── Identity resolution ───────────────────────────────────────────────────
    const identity = resolveIdentity({ request: context.request, security: getCoreSecurity() });

    if (!identity) {
      // No identity — fail open with an informational message.
      return {
        results: [
          {
            type: ToolResultType.other,
            data: { memories: [], note: 'No user identity available; recall skipped.' },
          },
        ],
      };
    }

    const result = await recallMemory({
      storage: getStorage(context.esClient.asCurrentUser),
      params: {
        query,
        category,
        limit,
        space_id: context.spaceId,
        identity,
      },
    });

    return {
      results: [
        {
          type: ToolResultType.other,
          data: { memories: result.memories },
        },
      ],
    };
  },
});
