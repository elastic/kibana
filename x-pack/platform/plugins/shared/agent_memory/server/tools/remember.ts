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
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { i18n } from '@kbn/i18n';
import { authorizeMemoryRequest } from '../core/authorize_request';
import { writeMemory } from '../core/write_memory';
import { AGENT_MEMORY_API_PRIVILEGES } from '../features';
import { rememberInputSchema } from '../schemas';
import type { GetMemoryStorage } from '../types';

/**
 * Creates the `platform.memory.remember` registered tool.
 *
 * Writes via `asCurrentUser` because Agent Memory is user data, so `kibana_system`
 * is unauthorized. Gated by the `write_agent_memory` Kibana
 * privilege checked via `checkPrivilegesWithRequest` before any ES call.
 * If the privilege check fails or the identity is missing, returns a typed
 * error without throwing (SIGN-OFF #2, verification item 6).
 */
export const createRememberTool = ({
  getStorage,
  getSecurityStart,
  getCoreSecurity,
  writeConfirmation = 'always',
}: {
  getStorage: GetMemoryStorage;
  getSecurityStart: () => SecurityPluginStart;
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

On success returns { id, revision, action } where action is 'created' or 'updated'.
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
  handler: async ({ title, description, category, type, tags, expires_at }, context) => {
    const authorization = await authorizeMemoryRequest({
      request: context.request,
      spaceId: context.spaceId,
      privilege: AGENT_MEMORY_API_PRIVILEGES.write,
      security: getSecurityStart(),
      coreSecurity: getCoreSecurity(),
    });

    if (authorization.status === 'forbidden') {
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

    if (authorization.status === 'missing_identity') {
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
        type,
        tags,
        expires_at,
        call_source: context.callContext.callSource,
        space_id: context.spaceId,
        identity: authorization.identity,
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
