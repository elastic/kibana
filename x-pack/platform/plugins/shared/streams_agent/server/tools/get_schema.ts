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

export const STREAMS_GET_SCHEMA_TOOL_ID = 'streams.get_schema';

const getSchemaSchema = z.object({
  name: z.string().min(1).describe('The name of the stream to get schema/field mappings for'),
});

export function createGetSchemaTool({
  core,
  logger,
}: {
  core: StreamsAgentCoreSetup;
  logger: Logger;
}): StaticToolRegistration<typeof getSchemaSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof getSchemaSchema> = {
    id: STREAMS_GET_SCHEMA_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Gets the field mappings for a stream, including mapped fields with their types, unmapped fields, and inherited fields (for wired streams). Useful for understanding the schema and identifying fields that need mapping.',
    tags: ['streams'],
    schema: getSchemaSchema,
    handler: async (toolParams, context) => {
      const { name } = toolParams;
      const { request } = context;
      try {
        const { streamsClient } = await getScopedStreamsClients({ core, request });
        const streamDefinition = await streamsClient.getStream(name);

        // Extract field information from the stream definition
        let fields = {};
        if (Streams.WiredStream.Definition.is(streamDefinition)) {
          fields = streamDefinition.ingest.wired.fields;
        } else if (Streams.ClassicStream.Definition.is(streamDefinition)) {
          fields = streamDefinition.ingest.classic.field_overrides ?? {};
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                stream: name,
                fields,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.get_schema tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to get schema for "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
