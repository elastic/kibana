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
  STREAMS_GET_STREAM_TOOL_ID as GET_STREAM,
  STREAMS_LIST_STREAMS_TOOL_ID as LIST_STREAMS,
} from './tool_ids';
import { classifyError } from './error_utils';

const getStreamSchema = z.object({
  name: z.string().describe('Exact stream name, e.g. "logs.nginx"'),
});

export const createGetStreamTool = ({
  getScopedClients,
}: {
  getScopedClients: GetScopedClients;
}): BuiltinToolDefinition<typeof getStreamSchema> => ({
  id: GET_STREAM,
  type: ToolType.builtin,
  description: dedent(`
    Returns the full definition of a single stream: type, description, retention policy, processing rules, field mappings, routing/partitions, and parent-child hierarchy.

    **When to use:**
    - User asks for a general overview of a stream
    - User asks about multiple aspects at once (schema + retention + routing)
    - User asks "tell me about stream X"

    **When NOT to use:**
    - User only asks about one specific aspect (schema, quality, lifecycle, or documents) — use the focused tool instead
  `),
  tags: ['streams'],
  schema: getStreamSchema,
  handler: async ({ name }, { request }) => {
    try {
      const { streamsClient } = await getScopedClients({ request });
      const definition = await streamsClient.getStream(name);

      const result: Record<string, unknown> = {
        name: definition.name,
        description: definition.description,
      };

      if (Streams.WiredStream.Definition.is(definition)) {
        result.type = 'wired';
        result.lifecycle = definition.ingest.lifecycle;
        result.processing = definition.ingest.processing;
        result.failure_store = definition.ingest.failure_store;
        result.fields = definition.ingest.wired.fields;
        result.routing = definition.ingest.wired.routing;

        const [ancestors, descendants] = await Promise.all([
          streamsClient.getAncestors(name),
          streamsClient.getDescendants(name),
        ]);

        result.ancestors = ancestors.map((a) => ({
          name: a.name,
          routing: a.ingest.wired.routing
            .filter(
              (r) => r.destination === name || descendants.some((d) => d.name === r.destination)
            )
            .map((r) => ({ destination: r.destination, condition: r.where, status: r.status })),
        }));
      } else if (Streams.ClassicStream.Definition.is(definition)) {
        result.type = 'classic';
        result.lifecycle = definition.ingest.lifecycle;
        result.processing = definition.ingest.processing;
        result.failure_store = definition.ingest.failure_store;
        result.field_overrides = definition.ingest.classic.field_overrides;
      } else if (Streams.QueryStream.Definition.is(definition)) {
        result.type = 'query';
        result.query = definition.query;
      }

      return {
        results: [{ type: ToolResultType.other, data: result }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to get stream "${name}": ${message}`,
              stream: name,
              operation: 'get_stream',
              likely_cause: classifyError(err, LIST_STREAMS),
            },
          },
        ],
      };
    }
  },
});
