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
import type { StreamlangDSL } from '@kbn/streamlang';
import dedent from 'dedent';
import type { GetScopedClients } from '../../../routes/types';
import { STREAMS_UPDATE_PROCESSORS_TOOL_ID } from '../tool_ids';
import { classifyError } from '../error_utils';
import { patchIngestAndUpsert } from '../../../lib/streams/helpers/ingest_upsert';
import { getConfirmationMessage } from './confirmation_helpers';
import { type StreamsWriteQueue, abortSignalFromRequest } from '../write_queue';

const updateProcessorsSchema = z.object({
  name: z.string().describe('Stream name, e.g. "logs.ecs.nginx"'),
  processing_json: z
    .string()
    .describe(
      'JSON string of the processing pipeline. Must have a "steps" array. Example: \'{"steps":[{"action":"grok","from":"message","patterns":["%{COMBINEDAPACHELOG}"]}]}\'. Use get_stream first to see the current pipeline format, then modify and pass the complete updated pipeline.'
    ),
  change_description: z
    .string()
    .optional()
    .describe(
      'Markdown summary of the pipeline change for the user confirmation prompt. Include current pipeline summary, proposed pipeline summary, and what changed.'
    ),
});

export const createUpdateProcessorsTool = ({
  getScopedClients,
  writeQueue,
}: {
  getScopedClients: GetScopedClients;
  writeQueue: StreamsWriteQueue;
}): BuiltinToolDefinition<typeof updateProcessorsSchema> => ({
  id: STREAMS_UPDATE_PROCESSORS_TOOL_ID,
  type: ToolType.builtin,
  description: dedent(`
    Updates the processing pipeline on a stream. Replaces the entire processing configuration with the provided definition.

    Use get_stream first to see the current processing pipeline, then modify it and pass the complete updated pipeline as a JSON string.
  `),
  tags: ['streams', 'management'],
  schema: updateProcessorsSchema,
  confirmation: {
    askUser: 'always',
    getConfirmation: ({ toolParams }) => ({
      title: i18n.translate('xpack.streams.agentBuilder.tools.updateProcessors.confirmTitle', {
        defaultMessage: 'Update processing pipeline on "{name}"',
        values: { name: toolParams.name },
      }),
      message: getConfirmationMessage(toolParams, 'change_description'),
      confirm_text: i18n.translate(
        'xpack.streams.agentBuilder.tools.updateProcessors.confirmButtonLabel',
        { defaultMessage: 'Update pipeline' }
      ),
      color: 'primary' as const,
    }),
  },
  handler: async ({ name, processing_json: processingJson }, { request }) => {
    const signal = abortSignalFromRequest(request);
    try {
      const { streamsClient, queryClient, attachmentClient } = await getScopedClients({
        request,
      });

      let processing: StreamlangDSL;
      try {
        processing = JSON.parse(processingJson) as StreamlangDSL;
      } catch {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Invalid processing JSON: ${processingJson}`,
                operation: 'update_processors',
                likely_cause: 'The processing_json parameter must be a valid JSON string.',
              },
            },
          ],
        };
      }

      const result = await writeQueue.enqueue(
        () =>
          patchIngestAndUpsert({
            streamsClient,
            queryClient,
            attachmentClient,
            name,
            patchFn: (currentIngest) => ({
              ...currentIngest,
              processing: {
                ...processing,
                updated_at: new Date().toISOString(),
              },
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
              note: 'Pipeline updated. This change affects newly ingested documents only — existing documents are not reprocessed.',
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
              message: `Failed to update processors on "${name}": ${message}`,
              stream: name,
              operation: 'update_processors',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});
