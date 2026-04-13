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
import { STREAMS_UPDATE_PROCESSORS_TOOL_ID } from '../tool_ids';
import { classifyError } from '../error_utils';
import { validateProcessingJson } from '../format_validation_errors';
import { patchIngestAndUpsert } from '../../../lib/streams/helpers/ingest_upsert';
import { getConfirmationMessage } from './confirmation_helpers';
import { type StreamsWriteQueue, abortSignalFromRequest } from '../write_queue';

const updateProcessorsSchema = z.object({
  name: z.string().describe('Stream name, e.g. "logs.ecs.nginx"'),
  processing_json: z
    .string()
    .describe(
      `Streamlang JSON string. Must have a "steps" array. Example: '{"steps":[{"action":"grok","from":"message","patterns":["%{COMBINEDAPACHELOG}"]}]}'. To remove a step, pass the pipeline without it: '{"steps":[]}'. Pass the complete updated pipeline — all existing steps plus any modifications. Common actions (key params): grok (from, patterns), dissect (from, pattern), date (from, formats, to), set (to, value|copy_from), rename (from, to), remove (from), convert (from, type). All actions support optional "where" (condition) and "ignore_failure".`
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

    Requires the complete updated pipeline as a JSON string. To remove a problematic processor, pass the pipeline without that step.
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
      const { streamsClient, getQueryClient, attachmentClient } = await getScopedClients({
        request,
      });
      const queryClient = await getQueryClient();

      let parsed: unknown;
      try {
        parsed = JSON.parse(processingJson);
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

      const validation = validateProcessingJson(parsed);
      if (!validation.success) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Invalid Streamlang pipeline: ${validation.error}`,
                operation: 'update_processors',
                likely_cause: 'invalid_streamlang',
              },
            },
          ],
        };
      }
      const processing = validation.data;

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
