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
import type { DataStreamClient } from '@kbn/data-streams';
import type { MemoryStorage } from '../storage/memory_storage';
import type { agentMemoryHistoryMappings } from '../storage/history_stream';
import { resolveIdentity } from '../core/resolve_identity';
import { tombstoneMemory } from '../core/tombstone_memory';
import { AGENT_MEMORY_API_PRIVILEGES } from '../features';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

const forgetSchema = z.object({
  id: z
    .string()
    .max(512)
    .describe('The memory id to soft-delete. Obtain this from a prior recall call.'),
});

/**
 * Creates the `platform.memory.forget` registered tool.
 *
 * Soft-deletes a memory (`deleted: true`). The document is never hard-deleted
 * and remains visible in ES|QL for admin inspection. Ownership is validated
 * before applying the tombstone (author + space must match).
 *
 * Gated by `write_agent_memory` privilege before any ES call.
 */
export const createForgetTool = ({
  getStorage,
  getHistoryClient,
  getSecurityStart,
}: {
  getStorage: () => MemoryStorage;
  getHistoryClient: () => DataStreamClient<typeof agentMemoryHistoryMappings>;
  getSecurityStart: () => SecurityPluginStart;
}): BuiltinToolDefinition<typeof forgetSchema> => ({
  id: platformMemoryTools.forget,
  type: ToolType.builtin,
  description: `
Soft-delete a memory so it is no longer recalled.

Use this tool when the user explicitly asks you to forget something, or when a memory
is known to be incorrect or outdated and should be suppressed.

The memory is marked deleted but not physically removed — it remains auditable.
Ownership is validated; you can only forget memories belonging to the current user.

Returns { result: 'deleted' } or { result: 'not_found' }.
  `.trim(),
  schema: forgetSchema,
  tags: [],
  annotations: {
    title: 'Forget',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async ({ id }, context) => {
    // ── Authz gate ───────────────────────────────────────────────────────────
    const security = getSecurityStart();
    const { hasAllRequested } = await security.authz
      .checkPrivilegesWithRequest(context.request)
      .atSpace(context.spaceId, {
        kibana: [security.authz.actions.api.get(AGENT_MEMORY_API_PRIVILEGES.write)],
      });

    if (!hasAllRequested) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message:
                'Forbidden: the current user does not have the write_agent_memory privilege.',
            },
          },
        ],
      };
    }

    // ── Identity resolution ───────────────────────────────────────────────────
    const identity = resolveIdentity({ request: context.request, security });
    if (!identity) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: 'Cannot forget memory: no user identity available for scoping.' },
          },
        ],
      };
    }

    // ── Tombstone ─────────────────────────────────────────────────────────────
    const result = await tombstoneMemory({
      storage: getStorage(),
      historyClient: getHistoryClient(),
      params: {
        id,
        space_id: context.spaceId,
        identity,
        call_source: context.callContext.callSource,
      },
    });

    return {
      results: [
        {
          type: ToolResultType.other,
          data: result,
        },
      ],
    };
  },
});
