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
import type { FailureStore } from '@kbn/streams-schema';
import dedent from 'dedent';
import type { GetScopedClients } from '../../../routes/types';
import { STREAMS_SET_FAILURE_STORE_TOOL_ID } from '../tool_ids';
import { classifyError } from '../error_utils';
import { patchIngestAndUpsert } from '../../../lib/streams/helpers/ingest_upsert';
import { getConfirmationMessage } from './confirmation_helpers';
import { type StreamsWriteQueue, abortSignalFromRequest } from '../write_queue';

const setFailureStoreSchema = z.object({
  name: z.string().describe('Stream name, e.g. "logs.ecs.nginx"'),
  failure_store_type: z
    .enum(['inherit', 'disabled', 'enabled', 'enabled_no_lifecycle'])
    .describe(
      'Failure store mode: "inherit" from parent, "disabled", "enabled" with retention, or "enabled_no_lifecycle" without lifecycle management'
    ),
  data_retention: z
    .string()
    .describe(
      'For "enabled" type only: retention period for failed documents, e.g. "30d". Pass empty string "" for no retention limit. Ignored for other types.'
    ),
  change_description: z
    .string()
    .optional()
    .describe(
      'Markdown summary of the failure store change for the user confirmation prompt. Include current setting, proposed setting, and any impact.'
    ),
});

const toFailureStore = (input: z.infer<typeof setFailureStoreSchema>): FailureStore => {
  switch (input.failure_store_type) {
    case 'inherit':
      return { inherit: {} };
    case 'disabled':
      return { disabled: {} };
    case 'enabled':
      return {
        lifecycle: { enabled: { data_retention: input.data_retention || undefined } },
      };
    case 'enabled_no_lifecycle':
      return { lifecycle: { disabled: {} } };
  }
};

export const createSetFailureStoreTool = ({
  getScopedClients,
  writeQueue,
}: {
  getScopedClients: GetScopedClients;
  writeQueue: StreamsWriteQueue;
}): BuiltinToolDefinition<typeof setFailureStoreSchema> => ({
  id: STREAMS_SET_FAILURE_STORE_TOOL_ID,
  type: ToolType.builtin,
  description: dedent(`
    Configures the failure store on a stream.

    **Options:**
    - inherit: Inherit failure store setting from the parent stream
    - disabled: Disable the failure store
    - enabled: Enable the failure store with a data retention period
    - enabled_no_lifecycle: Enable the failure store without lifecycle management
  `),
  tags: ['streams', 'management'],
  schema: setFailureStoreSchema,
  confirmation: {
    askUser: 'always',
    getConfirmation: ({ toolParams }) => ({
      title: i18n.translate('xpack.streams.agentBuilder.tools.setFailureStore.confirmTitle', {
        defaultMessage: 'Update failure store on "{name}"',
        values: { name: toolParams.name },
      }),
      message: getConfirmationMessage(toolParams, 'change_description'),
      confirm_text: i18n.translate(
        'xpack.streams.agentBuilder.tools.setFailureStore.confirmButtonLabel',
        { defaultMessage: 'Update failure store' }
      ),
      color: 'primary' as const,
    }),
  },
  handler: async (params, { request }) => {
    const { name } = params;
    const signal = abortSignalFromRequest(request);
    try {
      const { streamsClient, getQueryClient, attachmentClient } = await getScopedClients({
        request,
      });
      const queryClient = await getQueryClient();

      const failureStore = toFailureStore(params);

      const result = await writeQueue.enqueue(
        () =>
          patchIngestAndUpsert({
            streamsClient,
            queryClient,
            attachmentClient,
            name,
            patchFn: (currentIngest) => ({
              ...currentIngest,
              failure_store: failureStore,
            }),
          }),
        signal
      );

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              success: true,
              stream: name,
              failure_store: failureStore,
              result: result.result,
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
              message: `Failed to set failure store on "${name}": ${message}`,
              stream: name,
              operation: 'set_failure_store',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});
