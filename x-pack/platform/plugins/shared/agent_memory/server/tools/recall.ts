/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { platformMemoryTools } from '@kbn/agent-builder-common/tools';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { resolveIdentity } from '../core/resolve_identity';
import { recallMemory } from '../core/recall_memory';
import { recallInputSchema } from '../schemas';
import type { GetMemoryStorage } from '../types';

/**
 * Creates the `platform.memory.recall` registered tool.
 *
 * Uses `asCurrentUser` for storage access because Agent Memory is user data,
 * so `kibana_system` is unauthorized. Data isolation is enforced via
 * mandatory personal-scope filters (`space_id + scope_kind + scope_id`) in
 * the ES|QL request body (G3). Elasticsearch authorization is enforced by the
 * request-scoped client. Recall **fails open**: ES errors return empty results
 * rather than propagating to the agent (D-security, G5).
 */
export const createRecallTool = ({
  getStorage,
  getCoreSecurity,
}: {
  getStorage: GetMemoryStorage;
  getCoreSecurity: () => SecurityServiceStart;
}): BuiltinToolDefinition<typeof recallInputSchema> => ({
  id: platformMemoryTools.recall,
  type: ToolType.builtin,
  description: `
Retrieve memories relevant to the current context for the authenticated user.

Returns a ranked list of memories (title, description, category, created date).
The result is a snapshot of what has been remembered; it does NOT reflect real-time data.

Use this tool to:
- Recall prior events, decisions, plans, and verified procedures
- Retrieve relevant facts from past conversations
- Ground the response in remembered context without issuing additional searches

Use tags to require exact generic groupings such as a project, customer, case, or workflow.
Every requested tag must be present on a recalled memory.

Fails open: if the memory service is unavailable, returns an empty list without error.
  `.trim(),
  schema: recallInputSchema,
  tags: [],
  annotations: {
    title: 'Recall Memories',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ query, category, tags, limit }, context) => {
    const identity = resolveIdentity({
      request: context.request,
      security: getCoreSecurity(),
    });

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
      logger: context.logger,
      params: {
        query,
        category,
        tags,
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
