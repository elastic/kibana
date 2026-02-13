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

export const STREAMS_DELETE_STREAM_TOOL_ID = 'streams.delete_stream';

const deleteStreamSchema = z.object({
  name: z.string().min(1).describe('The name of the stream to delete'),
});

export function createDeleteStreamTool({
  core,
}: {
  core: StreamsAgentCoreSetup;
}): StaticToolRegistration<typeof deleteStreamSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof deleteStreamSchema> = {
    id: STREAMS_DELETE_STREAM_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Deletes a stream. Cannot delete the root "logs" stream. IMPORTANT: This is a destructive operation — always preview and get explicit user confirmation before calling.',
    tags: ['streams'],
    schema: deleteStreamSchema,
    handler: async (toolParams, context) => {
      const { name } = toolParams;
      const { request, logger } = context;
      try {
        const { streamsClient } = await getScopedStreamsClients({ core, request });
        await streamsClient.deleteStream(name);

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: `Successfully deleted stream "${name}"`,
                stream: name,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.delete_stream tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to delete stream "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
