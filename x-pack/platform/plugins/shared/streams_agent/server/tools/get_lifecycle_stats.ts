/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { Logger } from '@kbn/core/server';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { Streams } from '@kbn/streams-schema';
import type { StreamsAgentCoreSetup } from '../types';
import { getScopedStreamsClients } from './get_scoped_clients';

export const STREAMS_GET_LIFECYCLE_STATS_TOOL_ID = 'streams.get_lifecycle_stats';

const getLifecycleStatsSchema = z.object({
  name: z.string().min(1).describe('The name of the stream to get lifecycle/retention stats for'),
});

export function createGetLifecycleStatsTool({
  core,
  logger,
}: {
  core: StreamsAgentCoreSetup;
  logger: Logger;
}): StaticToolRegistration<typeof getLifecycleStatsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getLifecycleStatsSchema> = {
    id: STREAMS_GET_LIFECYCLE_STATS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Gets lifecycle and retention information for a stream, including the current retention policy (type, value, and source), storage size, and data tier distribution.',
    tags: ['streams'],
    schema: getLifecycleStatsSchema,
    handler: async (toolParams, context) => {
      const { name } = toolParams;
      const { request } = context;
      try {
        const { streamsClient, scopedClusterClient } = await getScopedStreamsClients({
          core,
          request,
        });
        const esClient = scopedClusterClient.asCurrentUser;
        const streamDefinition = await streamsClient.getStream(name);

        // Extract lifecycle from stream definition
        let lifecycle;
        if (Streams.WiredStream.Definition.is(streamDefinition) || Streams.ClassicStream.Definition.is(streamDefinition)) {
          lifecycle = streamDefinition.ingest.lifecycle;
        }

        // Get data stream stats for storage info
        let storageSizeBytes: number | undefined;
        let docCount: number | undefined;
        try {
          const statsResponse = await esClient.indices.stats({ index: name });
          const total = statsResponse._all?.total;
          storageSizeBytes = total?.store?.size_in_bytes;
          docCount = total?.docs?.count;
        } catch {
          // Stats may not be available
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                stream: name,
                lifecycle,
                storageSizeBytes,
                documentCount: docCount,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.get_lifecycle_stats tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to get lifecycle stats for "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
