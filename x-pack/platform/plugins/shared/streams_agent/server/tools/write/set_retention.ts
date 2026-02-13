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
import type { IngestStreamLifecycle } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import type { StreamsAgentCoreSetup } from '../../types';
import { getScopedStreamsClients } from '../get_scoped_clients';
import { buildIngestUpsertRequest } from './build_upsert_request';

export const STREAMS_SET_RETENTION_TOOL_ID = 'streams.set_retention';

const setRetentionSchema = z.object({
  name: z.string().min(1).describe('The name of the stream to update retention for'),
  retentionDays: z
    .number()
    .positive()
    .optional()
    .describe('Retention period in days. Omit to inherit from parent/template.'),
  ilmPolicy: z
    .string()
    .optional()
    .describe('Name of an ILM policy to apply. Mutually exclusive with retentionDays.'),
  inherit: z
    .boolean()
    .optional()
    .describe('If true, inherit retention from the parent stream or index template.'),
});

export function createSetRetentionTool({
  core,
}: {
  core: StreamsAgentCoreSetup;
}): StaticToolRegistration<typeof setRetentionSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof setRetentionSchema> = {
    id: STREAMS_SET_RETENTION_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Updates the data retention policy for a stream. Can set a specific retention period in days, apply an ILM policy, or inherit from parent stream/index template. IMPORTANT: Always preview the change and get user confirmation before calling this tool.',
    tags: ['streams'],
    schema: setRetentionSchema,
    handler: async (toolParams, context) => {
      const { name, retentionDays, ilmPolicy, inherit } = toolParams;
      const { request, logger } = context;
      try {
        const { streamsClient } = await getScopedStreamsClients({ core, request });

        const stream = await streamsClient.getStream(name);
        if (!Streams.WiredStream.Definition.is(stream) && !Streams.ClassicStream.Definition.is(stream)) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: { message: 'Retention can only be set on ingest streams (wired or classic).' },
              },
            ],
          };
        }

        // Build the lifecycle configuration
        let lifecycle: IngestStreamLifecycle;
        if (inherit) {
          lifecycle = { inherit: {} };
        } else if (ilmPolicy) {
          lifecycle = { ilm: { policy: ilmPolicy } };
        } else if (retentionDays) {
          lifecycle = { dsl: { data_retention: `${retentionDays}d` } };
        } else {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message:
                    'Must specify one of: retentionDays, ilmPolicy, or inherit=true',
                },
              },
            ],
          };
        }

        const upsertRequest = buildIngestUpsertRequest(stream, { lifecycle });
        await streamsClient.upsertStream({ name, request: upsertRequest });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: `Successfully updated retention for stream "${name}"`,
                stream: name,
                lifecycle,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.set_retention tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to set retention for "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
