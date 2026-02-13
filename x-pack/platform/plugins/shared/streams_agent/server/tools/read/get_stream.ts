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
import type { StreamsAgentCoreSetup } from '../../types';
import { getScopedStreamsClients } from '../get_scoped_clients';

export const STREAMS_GET_STREAM_TOOL_ID = 'streams.get_stream';

const getStreamSchema = z.object({
  name: z.string().min(1).describe('The name of the stream to retrieve (e.g. "logs", "logs.nginx")'),
});

export function createGetStreamTool({
  core,
}: {
  core: StreamsAgentCoreSetup;
}): StaticToolRegistration<typeof getStreamSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getStreamSchema> = {
    id: STREAMS_GET_STREAM_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Gets the full configuration for a specific stream, including its type, retention policy, processors, partitions (child streams with routing conditions), field mappings, and description.',
    tags: ['streams'],
    schema: getStreamSchema,
    handler: async (toolParams, context) => {
      const { name } = toolParams;
      const { request, logger } = context;
      try {
        const { streamsClient } = await getScopedStreamsClients({ core, request });
        const streamDefinition = await streamsClient.getStream(name);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                stream: streamDefinition,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.get_stream tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to get stream "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
