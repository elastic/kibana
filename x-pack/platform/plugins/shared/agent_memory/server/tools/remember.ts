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
import { writeMemory } from '../core/write_memory';
import { AGENT_MEMORY_API_PRIVILEGES } from '../features';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

const rememberSchema = z.object({
  title: z
    .string()
    .max(500)
    .describe('Short label for this memory. Displayed to the user and used in keyword search.'),
  description: z
    .string()
    .max(10000)
    .describe('Full content of the memory. Write in clear, complete sentences.'),
  category: z
    .enum(['profile', 'preferences', 'entities', 'events', 'trajectories'])
    .optional()
    .describe(
      'Memory category: profile (user attributes), preferences (stated preferences), ' +
        'entities (people / places / things), events (occurred actions), ' +
        'trajectories (plans or goals). Defaults to the most appropriate category.'
    ),
  type: z
    .enum(['episodic', 'semantic', 'procedural'])
    .optional()
    .describe(
      'Memory type: episodic (specific event), semantic (general fact), procedural (how-to).'
    ),
  tags: z
    .array(z.string().max(100))
    .max(20)
    .optional()
    .describe('Optional classification tags.'),
  entities: z
    .array(z.string().max(256))
    .max(50)
    .optional()
    .describe('Entity ids (people, assets, systems) this memory is about.'),
  expires_at: z
    .string()
    .optional()
    .describe('ISO-8601 timestamp after which this memory should no longer be recalled.'),
});

/**
 * Creates the `platform.memory.remember` registered tool.
 *
 * Writes via `asInternalUser`; gated by the `write_agent_memory` Kibana
 * privilege checked via `checkPrivilegesWithRequest` before any ES call.
 * If the privilege check fails or the identity is missing, returns a typed
 * error without throwing (SIGN-OFF #2, verification item 6).
 */
export const createRememberTool = ({
  getStorage,
  getHistoryClient,
  getSecurityStart,
}: {
  getStorage: () => MemoryStorage;
  getHistoryClient: () => DataStreamClient<typeof agentMemoryHistoryMappings>;
  getSecurityStart: () => SecurityPluginStart;
}): BuiltinToolDefinition<typeof rememberSchema> => ({
  id: platformMemoryTools.remember,
  type: ToolType.builtin,
  description: `
Store a memory about the user for future recall.

Use this tool to persist information that is:
- Explicitly stated by the user ("I prefer…", "I work on…")
- Relevant across future conversations
- Too important to lose at the end of this session

Do NOT use this tool for ephemeral context, search results, or intermediate reasoning steps.
Only call this tool when you have concrete, user-relevant information to save.

On success returns { id, revision, action } where action is 'created' or 'updated'.
  `.trim(),
  schema: rememberSchema,
  tags: [],
  annotations: {
    title: 'Remember',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async (
    { title, description, category, type, tags, entities, expires_at },
    context
  ) => {
    // ── Authz gate: must have write_agent_memory before any ES call ──────────
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
            data: {
              message: 'Cannot store memory: no user identity available for scoping.',
            },
          },
        ],
      };
    }

    // ── Write ─────────────────────────────────────────────────────────────────
    const result = await writeMemory({
      storage: getStorage(),
      historyClient: getHistoryClient(),
      params: {
        title,
        description,
        category,
        type,
        tags,
        entities,
        expires_at,
        call_source: context.callContext.callSource,
        space_id: context.spaceId,
        identity,
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
