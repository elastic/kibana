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
import type { MemoryStorage } from '../storage/memory_storage';
import { resolveIdentity } from '../core/resolve_identity';
import { recallMemory } from '../core/recall_memory';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

const recallSchema = z.object({
  query: z
    .string()
    .max(2000)
    .describe('The query text used to retrieve relevant memories.'),
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
 * Uses `asInternalUser` for storage access; data isolation is enforced via
 * mandatory `space_id + author` filters in `buildRetriever` (G3). The
 * `read_agent_memory` Kibana privilege is the authz gate (enforced by the
 * agent builder route). Recall **fails open**: ES errors return empty results
 * rather than propagating to the agent (D-security, G5).
 */
export const createRecallTool = ({
  getStorage,
  getSecurityStart,
}: {
  getStorage: () => MemoryStorage;
  getSecurityStart: () => SecurityPluginStart;
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
    const identity = resolveIdentity({ request: context.request, security });

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
      storage: getStorage(),
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
