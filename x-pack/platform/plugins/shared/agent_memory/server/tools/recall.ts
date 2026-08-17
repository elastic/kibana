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
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { authorizeMemoryRequest } from '../core/authorize_request';
import { recallMemory } from '../core/recall_memory';
import { AGENT_MEMORY_API_PRIVILEGES } from '../features';
import { recallInputSchema } from '../schemas';
import type { GetMemoryStorage } from '../types';

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
}): BuiltinToolDefinition<typeof recallInputSchema> => ({
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
  schema: recallInputSchema,
  tags: [],
  annotations: {
    title: 'Recall Memories',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ query, category, limit }, context) => {
    const authorization = await authorizeMemoryRequest({
      request: context.request,
      spaceId: context.spaceId,
      privilege: AGENT_MEMORY_API_PRIVILEGES.read,
      security: getSecurityStart(),
      coreSecurity: getCoreSecurity(),
    });

    if (authorization.status === 'forbidden') {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: { memories: [], note: 'Insufficient privileges to recall memories.' },
          },
        ],
      };
    }

    if (authorization.status === 'missing_identity') {
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
        identity: authorization.identity,
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
