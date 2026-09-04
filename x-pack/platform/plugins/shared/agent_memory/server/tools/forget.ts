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
import { tombstoneMemory } from '../core/tombstone_memory';
import { forgetInputSchema } from '../schemas';
import type { GetMemoryStorage } from '../types';

/**
 * Creates the `platform.memory.forget` registered tool.
 *
 * Soft-deletes a memory (`deleted: true`). The document is never hard-deleted
 * and remains visible in ES|QL for admin inspection. Ownership is validated
 * before applying the tombstone (user scope + space must match).
 * Elasticsearch authorization is enforced by the request-scoped client.
 */
export const createForgetTool = ({
  getStorage,
  getCoreSecurity,
  writeConfirmation = 'always',
}: {
  getStorage: GetMemoryStorage;
  getCoreSecurity: () => SecurityServiceStart;
  writeConfirmation?: ToolConfirmationPolicyMode;
}): BuiltinToolDefinition<typeof forgetInputSchema> => ({
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
  schema: forgetInputSchema,
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
    const identity = resolveIdentity({
      request: context.request,
      security: getCoreSecurity(),
    });

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
      storage: getStorage(context.esClient.asCurrentUser),
      params: {
        id,
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
