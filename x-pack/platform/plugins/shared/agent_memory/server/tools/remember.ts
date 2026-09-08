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
Store concrete, user-relevant information for future recall across conversations.

Do not store ephemeral context, search results, or intermediate reasoning.

When the user corrects or replaces stored information, recall related memories first.
Save the replacement, then forget only clearly outdated or contradictory entries.

Returns { id, revision, action } where action is 'created' or 'updated'.
  `.trim(),
  schema: rememberInputSchema,
  tags: [],
  confirmation: {
    askUser: writeConfirmation,
    getConfirmation: ({ toolParams }) => ({
      title: i18n.translate('xpack.agentMemory.agentBuilder.tools.remember.confirmationTitle', {
        defaultMessage: 'Remember "{title}"',
        values: { title: toolParams.title },
      }),
      message:
        toolParams.scope === 'space'
          ? i18n.translate(
              'xpack.agentMemory.agentBuilder.tools.remember.confirmationDescriptionSpace',
              {
                defaultMessage:
                  'Save to team memory for this space?\n\n' +
                  'Others in this space who use Agent Memory will recall it.\n\n{content}',
                values: { content: toolParams.description },
              }
            )
          : i18n.translate(
              'xpack.agentMemory.agentBuilder.tools.remember.confirmationDescription',
              {
                defaultMessage: 'Save this memory for future conversations?\n\n{content}',
                values: { content: toolParams.description },
              }
            ),
      confirm_text:
        toolParams.scope === 'space'
          ? i18n.translate(
              'xpack.agentMemory.agentBuilder.tools.remember.confirmationButtonLabelSpace',
              { defaultMessage: 'Share with team' }
            )
          : i18n.translate(
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
  handler: async (
    { title, description, category, tags, expires_at, scope, used_memory_ids },
    context
  ) => {
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
        scope,
        used_memory_ids,
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
