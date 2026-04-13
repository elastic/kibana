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
import { Streams } from '@kbn/streams-schema';
import dedent from 'dedent';
import type { GetScopedClients } from '../../../routes/types';
import { STREAMS_UPDATE_DESCRIPTION_TOOL_ID } from '../tool_ids';
import { classifyError } from '../error_utils';
import { getStreamAssets } from '../../../lib/streams/helpers/ingest_upsert';
import { getConfirmationMessage } from './confirmation_helpers';
import { type StreamsWriteQueue, abortSignalFromRequest } from '../write_queue';

const updateDescriptionSchema = z.object({
  name: z.string().describe('Stream name, e.g. "logs.ecs.nginx"'),
  description: z.string().describe('New description for the stream'),
  change_description: z
    .string()
    .optional()
    .describe(
      'Markdown summary of the description change for the user confirmation prompt. Include current and new description.'
    ),
});

export const createUpdateStreamDescriptionTool = ({
  getScopedClients,
  writeQueue,
}: {
  getScopedClients: GetScopedClients;
  writeQueue: StreamsWriteQueue;
}): BuiltinToolDefinition<typeof updateDescriptionSchema> => ({
  id: STREAMS_UPDATE_DESCRIPTION_TOOL_ID,
  type: ToolType.builtin,
  description: dedent(`
    Updates the description of a stream.
  `),
  tags: ['streams', 'management'],
  schema: updateDescriptionSchema,
  confirmation: {
    askUser: 'always',
    getConfirmation: ({ toolParams }) => ({
      title: i18n.translate(
        'xpack.streams.agentBuilder.tools.updateStreamDescription.confirmTitle',
        {
          defaultMessage: 'Update description of "{name}"',
          values: { name: toolParams.name },
        }
      ),
      message: getConfirmationMessage(toolParams, 'change_description'),
      confirm_text: i18n.translate(
        'xpack.streams.agentBuilder.tools.updateStreamDescription.confirmButtonLabel',
        { defaultMessage: 'Update description' }
      ),
      color: 'primary' as const,
    }),
  },
  handler: async ({ name, description }, { request }) => {
    const signal = abortSignalFromRequest(request);
    try {
      const { streamsClient, getQueryClient, attachmentClient } = await getScopedClients({
        request,
      });
      const queryClient = await getQueryClient();

      const definition = await streamsClient.getStream(name);
      const { dashboards, queries, rules } = await getStreamAssets({
        name,
        queryClient,
        attachmentClient,
      });

      let upsertRequest: Streams.all.UpsertRequest;

      if (Streams.WiredStream.Definition.is(definition)) {
        const { name: _n, updated_at: _u, ingest, ...rest } = definition;
        const { processing, ...ingestRest } = ingest;
        const { updated_at: _pu, ...processingRest } = processing;
        upsertRequest = {
          dashboards,
          queries,
          rules,
          stream: { ...rest, description, ingest: { ...ingestRest, processing: processingRest } },
        };
      } else if (Streams.ClassicStream.Definition.is(definition)) {
        const { name: _n, updated_at: _u, ingest, ...rest } = definition;
        const { processing, ...ingestRest } = ingest;
        const { updated_at: _pu, ...processingRest } = processing;
        upsertRequest = {
          dashboards,
          queries,
          rules,
          stream: { ...rest, description, ingest: { ...ingestRest, processing: processingRest } },
        };
      } else if (Streams.QueryStream.Definition.is(definition)) {
        const { name: _n, updated_at: _u, ...queryStream } = definition;
        upsertRequest = {
          dashboards,
          queries,
          rules,
          stream: { ...queryStream, description },
        };
      } else {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Stream "${name}" has an unsupported type.`,
                stream: name,
                operation: 'update_stream_description',
                likely_cause: 'Unknown stream type.',
              },
            },
          ],
        };
      }

      const result = await writeQueue.enqueue(
        () =>
          streamsClient.upsertStream({
            request: upsertRequest,
            name,
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
              description,
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
              message: `Failed to update description on "${name}": ${message}`,
              stream: name,
              operation: 'update_stream_description',
              likely_cause: classifyError(err),
            },
          },
        ],
      };
    }
  },
});
