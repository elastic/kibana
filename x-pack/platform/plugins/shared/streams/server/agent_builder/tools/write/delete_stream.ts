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
import { classifyError } from '../error_utils';
import { getConfirmationMessage } from './confirmation_helpers';
import { type StreamsWriteQueue, abortSignalFromRequest } from '../write_queue';

const deleteStreamSchema = z.object({
  name: z.string().describe('Stream name to delete, e.g. "logs.ecs.nginx"'),
  change_description: z
    .string()
    .optional()
    .describe(
      'Markdown summary of the deletion for the user confirmation prompt. Include child streams, approximate document count, retention policy, and any warnings.'
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
    Permanently deletes a stream and all of its child streams. This is irreversible.

    **When to use:**
    - User explicitly asks to delete or remove a stream

    **When NOT to use:**
    - User wants to stop routing to a child — suggest disabling the routing rule on the parent instead
    - User wants to remove processors or field mappings — use the appropriate focused tool
  `),
  tags: ['streams', 'management'],
  schema: deleteStreamSchema,
  confirmation: {
    askUser: 'always',
    getConfirmation: ({ toolParams }) => ({
      title: i18n.translate('xpack.streams.agentBuilder.tools.deleteStream.confirmTitle', {
        defaultMessage: 'Permanently delete stream "{name}"',
        values: { name: toolParams.name },
      }),
      message: getConfirmationMessage(toolParams, 'change_description'),
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
