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
import { Streams } from '@kbn/streams-schema';
import type { FieldDefinition, FieldDefinitionConfig } from '@kbn/streams-schema';
import type { StreamsAgentCoreSetup } from '../../types';
import { getScopedStreamsClients } from '../get_scoped_clients';
import { buildIngestUpsertRequest } from './build_upsert_request';

export const STREAMS_MAP_FIELDS_TOOL_ID = 'streams.map_fields';

const fieldMappingSchema = z.object({
  name: z.string().describe('The field name'),
  type: z
    .enum(['keyword', 'match_only_text', 'long', 'double', 'date', 'boolean', 'ip', 'geo_point'])
    .describe('The Elasticsearch field type'),
});

const mapFieldsSchema = z.object({
  name: z.string().min(1).describe('The name of the stream to update field mappings for'),
  fields: z.array(fieldMappingSchema).describe('List of field name/type pairs to map'),
});

export function createMapFieldsTool({
  core,
}: {
  core: StreamsAgentCoreSetup;
}): StaticToolRegistration<typeof mapFieldsSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof mapFieldsSchema> = {
    id: STREAMS_MAP_FIELDS_TOOL_ID,
    type: ToolType.builtin,
    description:
      'Updates field mappings for a stream. Maps unmapped fields to specific Elasticsearch types for better query performance. IMPORTANT: Always preview and get user confirmation before calling.',
    tags: ['streams'],
    schema: mapFieldsSchema,
    handler: async (toolParams, context) => {
      const { name, fields } = toolParams;
      const { request, logger } = context;
      try {
        const { streamsClient } = await getScopedStreamsClients({ core, request });

        const stream = await streamsClient.getStream(name);
        if (!Streams.WiredStream.Definition.is(stream)) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: { message: 'Field mappings can only be set on wired streams.' },
              },
            ],
          };
        }

        // Convert fields array to the FieldDefinition format
        const newFields: FieldDefinition = {};
        for (const field of fields) {
          newFields[field.name] = { type: field.type } as FieldDefinitionConfig;
        }

        const upsertRequest = buildIngestUpsertRequest(stream, { wiredFields: newFields });
        await streamsClient.upsertStream({ name, request: upsertRequest });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                message: `Successfully mapped ${fields.length} field(s) for stream "${name}"`,
                stream: name,
                mappedFields: fields,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(`streams.map_fields tool error: ${error}`);
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to map fields for "${name}": ${error.message}`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
