/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { Streams } from '@kbn/streams-schema';
import dedent from 'dedent';
import type { GetScopedClients } from '../../routes/types';
import {
  STREAMS_LIST_STREAMS_TOOL_ID as LIST_STREAMS,
  STREAMS_GET_STREAM_TOOL_ID as GET_STREAM,
} from './tool_ids';
import { classifyError } from './error_utils';

const listStreamsSchema = z.object({});

export const createListStreamsTool = ({
  getScopedClients,
}: {
  getScopedClients: GetScopedClients;
}): BuiltinToolDefinition<typeof listStreamsSchema> => ({
  id: LIST_STREAMS,
  type: ToolType.builtin,
  description: dedent(`
    Lists all streams the current user has access to, returning each stream's name, type (wired, classic, or query), and description.

    **When to use:**
    - User asks "what streams do I have?" or "show me my streams"
    - You need to resolve a partial stream name (e.g. "nginx") to an exact name (e.g. "logs.nginx")
    - Comparing storage or quality across multiple streams (combine with get_lifecycle_stats or get_data_quality)
    - Discovering available streams before drilling into one

    **When NOT to use:**
    - User already named an exact stream and wants details — use ${GET_STREAM} instead
  `),
  tags: ['streams'],
  schema: listStreamsSchema,
  handler: async (_params, { request }) => {
    try {
      const { streamsClient } = await getScopedClients({ request });
      const allStreams = await streamsClient.listStreamsWithDataStreamExistence();

      const streams = allStreams
        .filter(({ exists }) => exists)
        .map(({ stream }) => {
          let type: string = 'unknown';
          if (Streams.WiredStream.Definition.is(stream)) {
            type = 'wired';
          } else if (Streams.ClassicStream.Definition.is(stream)) {
            type = 'classic';
          } else if (Streams.QueryStream.Definition.is(stream)) {
            type = 'query';
          }
          return {
            name: stream.name,
            type,
            description: stream.description || '',
          };
        });

      return {
        results: [{ type: ToolResultType.other, data: { streams, count: streams.length } }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to list streams: ${message}`,
              operation: 'list_streams',
              likely_cause: classifyError(err, LIST_STREAMS),
            },
          },
        ],
      };
    }
  },
});
