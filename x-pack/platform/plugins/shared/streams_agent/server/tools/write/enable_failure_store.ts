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
import type { FailureStore } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import type { StreamsAgentCoreSetup } from '../../types';
import { getScopedStreamsClients } from '../get_scoped_clients';
import { buildIngestUpsertRequest } from './build_upsert_request';

export const STREAMS_ENABLE_FAILURE_STORE_TOOL_ID = 'streams.enable_failure_store';

const enableFailureStoreSchema = z.object({
  name: z.string().min(1).describe('The name of the stream'),
  enabled: z.boolean().describe('Whether to enable (true) or disable (false) the failure store'),
});

export function createEnableFailureStoreTool({
  core,
}: {
  core: StreamsAgentCoreSetup;
}): StaticToolRegistration<typeof enableFailureStoreSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof enableFailureStoreSchema> = {
    id: STREAMS_ENABLE_FAILURE_STORE_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Enables or disables the failure store for a stream. The failure store captures documents that fail to ingest due to mapping errors, allowing them to be examined and reprocessed. IMPORTANT: Always preview and get user confirmation before calling.',
    tags: ['streams'],
    schema: enableFailureStoreSchema,
    handler: async (toolParams, context) => {
      const { name, enabled } = toolParams;
      const { request, logger } = context;
      try {
        const { streamsClient } = await getScopedStreamsClients({ core, request });

        const stream = await streamsClient.getStream(name);
        if (
          !Streams.WiredStream.Definition.is(stream) &&
          !Streams.ClassicStream.Definition.is(stream)
        ) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message:
                    'Failure store can only be configured on ingest streams (wired or classic).',
                },
              },
            ],
          };
        }

        // FailureStoreEnabledWithoutLifecycle = failure store ON, lifecycle management OFF
        // FailureStoreDisabled = failure store OFF entirely
        const failureStore: FailureStore = enabled
          ? { lifecycle: { disabled: {} } }
          : { disabled: {} };

        const upsertRequest = buildIngestUpsertRequest(stream, { failure_store: failureStore });
        await streamsClient.upsertStream({ name, request: upsertRequest });

        const state = enabled ? 'enabled' : 'disabled';
        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: `Successfully ${state} failure store for stream "${name}"`,
                stream: name,
                failureStoreEnabled: enabled,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.enable_failure_store tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to update failure store for "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
