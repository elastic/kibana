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
import type { IngestStreamLifecycle } from '@kbn/streams-schema';
import dedent from 'dedent';
import type { GetScopedClients } from '../../../routes/types';
import { STREAMS_SET_RETENTION_TOOL_ID } from '../tool_ids';
import { classifyError } from '../error_utils';
import { patchIngestAndUpsert } from '../../../lib/streams/helpers/ingest_upsert';
import { getConfirmationMessage } from './confirmation_helpers';
import { type StreamsWriteQueue, abortSignalFromRequest } from '../write_queue';

const setRetentionSchema = z.object({
  name: z.string().describe('Stream name, e.g. "logs.ecs.nginx"'),
  lifecycle_type: z
    .enum(['inherit', 'dsl', 'ilm'])
    .describe(
      'Lifecycle type: "inherit" = inherit from parent, "dsl" = set a data retention period, "ilm" = use an ILM policy'
    ),
  data_retention: z
    .string()
    .optional()
    .describe(
      'Required for "dsl" type only: retention period, e.g. "30d", "90d", "1y". Omit for unlimited retention.'
    ),
  ilm_policy: z.string().optional().describe('Required for "ilm" type only: ILM policy name.'),
  change_description: z
    .string()
    .optional()
    .describe(
      'Markdown summary of the retention change for the user confirmation prompt. Include current retention, proposed retention, and any impact.'
    ),
});

const toIngestLifecycle = (input: z.infer<typeof setRetentionSchema>): IngestStreamLifecycle => {
  switch (input.lifecycle_type) {
    case 'inherit':
      return { inherit: {} };
    case 'dsl':
      return {
        dsl: { data_retention: input.data_retention || undefined },
      };
    case 'ilm':
      return { ilm: { policy: input.ilm_policy ?? '' } };
  }
};

export const createSetRetentionTool = ({
  getScopedClients,
  writeQueue,
}: {
  getScopedClients: GetScopedClients;
  writeQueue: StreamsWriteQueue;
}): BuiltinToolDefinition<typeof setRetentionSchema> => ({
  id: STREAMS_SET_RETENTION_TOOL_ID,
  type: ToolType.builtin,
  description: dedent(`
    Sets the retention/lifecycle policy on a stream.

    **Options:**
    - inherit: Inherit retention from the parent stream
    - dsl: Set a specific data retention period (e.g. "30d", "90d")
    - ilm: Use a named ILM (Index Lifecycle Management) policy
  `),
  tags: ['streams', 'management'],
  schema: setRetentionSchema,
  confirmation: {
    askUser: 'always',
    getConfirmation: ({ toolParams }) => ({
      title: i18n.translate('xpack.streams.agentBuilder.tools.setRetention.confirmTitle', {
        defaultMessage: 'Update retention on "{name}"',
        values: { name: toolParams.name },
      }),
      message: getConfirmationMessage(toolParams, 'change_description'),
      confirm_text: i18n.translate(
        'xpack.streams.agentBuilder.tools.setRetention.confirmButtonLabel',
        { defaultMessage: 'Update retention' }
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

      const ingestLifecycle = toIngestLifecycle(params);

      const result = await writeQueue.enqueue(
        () =>
          patchIngestAndUpsert({
            streamsClient,
            queryClient,
            attachmentClient,
            name,
            patchFn: (currentIngest) => ({
              ...currentIngest,
              lifecycle: ingestLifecycle,
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
              lifecycle: ingestLifecycle,
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
              message: `Failed to set retention on "${name}": ${message}`,
              stream: name,
              operation: 'set_retention',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});
