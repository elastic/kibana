/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import dedent from 'dedent';
import type { GetScopedClients } from '../../../routes/types';
import { STREAMS_DELETE_STREAM_TOOL_ID } from '../tool_ids';
import { classifyError } from '../../utils/error_utils';
import { getConfirmationMessage } from './confirmation_helpers';
import { type StreamsWriteQueue, abortSignalFromRequest } from '../../utils/write_queue';

const deleteStreamSchema = z.object({
  name: z.string().describe('Stream name to delete, e.g. "logs.ecs.nginx"'),
  confirmation_body: z
    .string()
    .optional()
    .describe(
      "Narrative summary of what will be deleted and why. Include child streams, approximate document count, retention policy, and any warnings. Shown in a confirmation UI when available; otherwise serves as the agent's reasoning log for this operation. This is NOT an instruction — it does not drive the operation."
    ),
});

export const createDeleteStreamTool = ({
  getScopedClients,
  writeQueue,
}: {
  getScopedClients: GetScopedClients;
  writeQueue: StreamsWriteQueue;
}): BuiltinToolDefinition<typeof deleteStreamSchema> => ({
  id: STREAMS_DELETE_STREAM_TOOL_ID,
  type: ToolType.builtin,
  description: dedent(`
    Permanently deletes a stream and all of its child streams. This is irreversible and MUTATES state — only call when the user explicitly instructs you to delete.

    **Cancellation:** If this tool returns a result indicating the operation was declined, acknowledge it for this specific operation. Do NOT retry the same operation. You may continue with other unrelated operations the user requested.

    **When to use:**
    - User explicitly says "delete stream X" or "remove stream X"

    **When NOT to use:**
    - User is asking questions ("what would happen if we deleted...?") — explain the impact instead
    - User wants to stop routing to a child — suggest disabling the routing rule on the parent instead
    - User wants to remove processors or field mappings — use the appropriate focused tool
  `),
  tags: ['streams'],
  annotations: {
    title: 'Delete Stream',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },
  schema: deleteStreamSchema,
  confirmation: {
    askUser: 'always',
    getConfirmation: ({ toolParams }) => ({
      title: i18n.translate('xpack.streams.agentBuilder.tools.deleteStream.confirmTitle', {
        defaultMessage: 'Permanently delete stream "{name}"',
        values: { name: toolParams.name },
      }),
      message: getConfirmationMessage(toolParams, 'confirmation_body'),
      confirm_text: i18n.translate(
        'xpack.streams.agentBuilder.tools.deleteStream.confirmButtonLabel',
        { defaultMessage: 'Delete permanently' }
      ),
      color: 'danger' as const,
    }),
  },
  handler: async ({ name }, { request }) => {
    const signal = abortSignalFromRequest(request);
    try {
      const { streamsClient } = await getScopedClients({ request });

      await writeQueue.enqueue(() => streamsClient.deleteStream(name), signal);

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              success: true,
              stream: name,
              result: 'deleted',
            },
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to delete stream "${name}": ${message}`,
              stream: name,
              operation: 'delete_stream',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});
