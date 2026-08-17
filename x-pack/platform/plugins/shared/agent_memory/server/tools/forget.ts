/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { ToolConfirmationPolicyMode } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { platformMemoryTools } from '@kbn/agent-builder-common/tools';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { i18n } from '@kbn/i18n';
import { authorizeMemoryRequest } from '../core/authorize_request';
import { tombstoneMemory } from '../core/tombstone_memory';
import { AGENT_MEMORY_API_PRIVILEGES } from '../features';
import type { GetMemoryStorage } from '../types';

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
  getSecurityStart,
  getCoreSecurity,
  writeConfirmation = 'always',
}: {
  getStorage: GetMemoryStorage;
  getSecurityStart: () => SecurityPluginStart;
  getCoreSecurity: () => SecurityServiceStart;
  writeConfirmation?: ToolConfirmationPolicyMode;
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
  confirmation: {
    askUser: writeConfirmation,
    getConfirmation: ({ toolParams }) => ({
      title: i18n.translate('xpack.agentMemory.agentBuilder.tools.forget.confirmationTitle', {
        defaultMessage: 'Forget memory "{id}"',
        values: { id: toolParams.id },
      }),
      message: i18n.translate(
        'xpack.agentMemory.agentBuilder.tools.forget.confirmationDescription',
        {
          defaultMessage:
            'Soft-delete this memory? It will no longer be recalled, but remains available for audit.',
        }
      ),
      confirm_text: i18n.translate(
        'xpack.agentMemory.agentBuilder.tools.forget.confirmationButtonLabel',
        { defaultMessage: 'Forget memory' }
      ),
      color: 'danger' as const,
    }),
  },
  annotations: {
    title: 'Forget',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async ({ id }, context) => {
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
            data: { message: 'Cannot forget memory: no user identity available for scoping.' },
          },
        ],
      };
    }

    // ── Tombstone ─────────────────────────────────────────────────────────────
    const result = await tombstoneMemory({
      storage: getStorage(context.esClient.asCurrentUser),
      params: {
        id,
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
