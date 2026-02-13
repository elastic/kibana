/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { partitionStream } from '@kbn/streams-ai';
import { Streams } from '@kbn/streams-schema';
import type { StreamsAgentCoreSetup } from '../../types';
import { getScopedStreamsClients } from '../get_scoped_clients';

export const STREAMS_SUGGEST_PARTITIONS_TOOL_ID = 'streams.suggest_partitions';

const suggestPartitionsSchema = z.object({
  name: z.string().min(1).describe('The name of the stream to suggest partitions for'),
  startMs: z
    .number()
    .optional()
    .describe('Start of the time range to analyze, as Unix timestamp in milliseconds. Defaults to 24 hours ago.'),
  endMs: z
    .number()
    .optional()
    .describe('End of the time range to analyze, as Unix timestamp in milliseconds. Defaults to now.'),
  userPrompt: z
    .string()
    .optional()
    .describe(
      'Optional guidance for the partition suggestion (e.g. "group by service name" or "separate error logs")'
    ),
});

export function createSuggestPartitionsTool({
  core,
}: {
  core: StreamsAgentCoreSetup;
}): StaticToolRegistration<typeof suggestPartitionsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof suggestPartitionsSchema> = {
    id: STREAMS_SUGGEST_PARTITIONS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Uses AI to suggest how a stream could be partitioned into child streams based on the data it contains. Analyzes log patterns and proposes routing conditions. This may take some time as it involves LLM reasoning.',
    tags: ['streams', 'ai'],
    schema: suggestPartitionsSchema,
    handler: async (toolParams, context) => {
      const { name, startMs, endMs, userPrompt } = toolParams;
      const { request, modelProvider, logger } = context;
      try {
        const { streamsClient, inferenceClient, scopedClusterClient } =
          await getScopedStreamsClients({ core, request });

        const { connector } = await modelProvider.getDefaultModel();
        const resolvedConnectorId = connector.connectorId;

        const stream = await streamsClient.getStream(name);
        if (!Streams.ingest.all.Definition.is(stream)) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message:
                    'Partition suggestions are only available for ingest streams (wired or classic).',
                },
              },
            ],
          };
        }

        const now = Date.now();
        const resolvedEndMs = endMs ?? now;
        const resolvedStartMs = startMs ?? resolvedEndMs - 24 * 60 * 60 * 1000;

        const abortController = new AbortController();
        const partitions = await partitionStream({
          definition: stream,
          inferenceClient: inferenceClient.bindTo({ connectorId: resolvedConnectorId }),
          esClient: scopedClusterClient.asCurrentUser,
          logger,
          start: resolvedStartMs,
          end: resolvedEndMs,
          maxSteps: 1,
          signal: abortController.signal,
          userPrompt,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: `AI suggested ${partitions.length} partition(s) for stream "${name}"`,
                stream: name,
                suggestedPartitions: partitions,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.suggest_partitions tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to suggest partitions for "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
