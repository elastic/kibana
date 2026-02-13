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

export const STREAMS_LIST_STREAMS_TOOL_ID = 'streams.list_streams';

const listStreamsSchema = z.object({});

export function createListStreamsTool({
  core,
}: {
  core: StreamsAgentCoreSetup;
}): StaticToolRegistration<typeof listStreamsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof listStreamsSchema> = {
    id: STREAMS_LIST_STREAMS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Lists all streams the user has access to. Returns each stream\'s name and description. Use this to discover available streams or when the user asks what streams they have.',
    tags: ['streams'],
    schema: listStreamsSchema,
    handler: async (_toolParams, context) => {
      const { request, logger } = context;
      try {
        const { streamsClient } = await getScopedStreamsClients({ core, request });
        const streams = await streamsClient.listStreams();

        const summary = streams.map((stream) => ({
          name: stream.name,
          description: stream.description,
        }));

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                total: streams.length,
                streams: summary,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.list_streams tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to list streams: ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
