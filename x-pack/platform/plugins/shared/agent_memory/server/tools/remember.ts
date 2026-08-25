/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { ToolConfirmationPolicyMode } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { platformMemoryTools } from '@kbn/agent-builder-common/tools';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import { i18n } from '@kbn/i18n';
import { resolveIdentity } from '../core/resolve_identity';
import { writeMemory } from '../core/write_memory';
import { rememberInputSchema } from '../schemas';
import type { GetMemoryStorage } from '../types';

/**
 * Creates the `platform.memory.remember` registered tool.
 *
 * Writes via `asCurrentUser` because Agent Memory is user data, so `kibana_system`
 * is unauthorized. Elasticsearch authorization is enforced by the request-scoped
 * client. If the identity is missing, returns a typed error without throwing.
 */
export const createRememberTool = ({
  getStorage,
  getCoreSecurity,
  writeConfirmation = 'always',
}: {
  getStorage: GetMemoryStorage;
  getCoreSecurity: () => SecurityServiceStart;
  writeConfirmation?: ToolConfirmationPolicyMode;
}): BuiltinToolDefinition<typeof rememberInputSchema> => ({
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

When the user corrects or replaces stored information, identify related memories first (recall if
needed). Save the replacement, then call platform.memory.forget only for memories that are clearly
outdated or contradictory.

On success returns { id, revision, action } where action is 'created' or 'updated'.
  `.trim(),
  schema: rememberInputSchema,
  tags: [],
  excludeFromMcp: true,
  confirmation: {
    askUser: writeConfirmation,
    getConfirmation: ({ toolParams }) => ({
      title: i18n.translate('xpack.agentMemory.agentBuilder.tools.remember.confirmationTitle', {
        defaultMessage: 'Remember "{title}"',
        values: { title: toolParams.title },
      }),
      message: i18n.translate(
        'xpack.agentMemory.agentBuilder.tools.remember.confirmationDescription',
        {
          defaultMessage: 'Save this memory for future conversations?\n\n{content}',
          values: { content: toolParams.description },
        }
      ),
      confirm_text: i18n.translate(
        'xpack.agentMemory.agentBuilder.tools.remember.confirmationButtonLabel',
        { defaultMessage: 'Remember' }
      ),
      color: 'primary' as const,
    }),
  },
  annotations: {
    title: 'Remember',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async ({ title, description, category, tags, expires_at }, context) => {
    const identity = resolveIdentity({
      request: context.request,
      security: getCoreSecurity(),
    });

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
    const esClient = context.esClient.asCurrentUser;
    const result = await writeMemory({
      storage: getStorage(esClient),
      esClient,
      params: {
        title,
        description,
        category,
        tags,
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
