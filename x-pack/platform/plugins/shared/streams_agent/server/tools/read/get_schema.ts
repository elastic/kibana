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
import { Streams, getInheritedFieldsFromAncestors } from '@kbn/streams-schema';
import type { StreamsAgentCoreSetup } from '../../types';
import { getScopedStreamsClients } from '../get_scoped_clients';

export const STREAMS_GET_SCHEMA_TOOL_ID = 'streams.get_schema';

const getSchemaSchema = z.object({
  name: z.string().min(1).describe('The name of the stream to get schema/field mappings for'),
});

const UNMAPPED_FIELDS_SAMPLE_SIZE = 500;

/**
 * Extracts all dot-notation field names from _source documents,
 * matching the pattern used by the unmapped_fields route in the streams plugin.
 */
function extractSourceFields(docs: Array<Record<string, unknown>>, prefix = ''): Set<string> {
  const fields = new Set<string>();
  for (const doc of docs) {
    for (const [key, value] of Object.entries(doc)) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      fields.add(fieldName);
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nested = extractSourceFields([value as Record<string, unknown>], fieldName);
        for (const f of nested) {
          fields.add(f);
        }
      }
    }
  }
  return fields;
}

export function createGetSchemaTool({
  core,
}: {
  core: StreamsAgentCoreSetup;
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
      const { request, logger } = context;
      try {
        const { streamsClient, scopedClusterClient } = await getScopedStreamsClients({
          core,
          request,
        });
        const esClient = scopedClusterClient.asCurrentUser;
        const streamDefinition = await streamsClient.getStream(name);

        // Extract mapped fields from the stream definition
        let mappedFields: Record<string, unknown> = {};
        let inheritedFields: Record<string, unknown> = {};

        if (Streams.WiredStream.Definition.is(streamDefinition)) {
          mappedFields = streamDefinition.ingest.wired.fields;

          // Get inherited fields from ancestors (same pattern as the streams plugin's
          // unmapped_fields route and read_stream handler)
          try {
            const ancestors = await streamsClient.getAncestors(name);
            if (ancestors.length > 0) {
              inheritedFields = getInheritedFieldsFromAncestors(ancestors);
            }
          } catch (e) {
            logger.debug(`Could not fetch ancestors for ${name}: ${e.message}`);
          }
        } else if (Streams.ClassicStream.Definition.is(streamDefinition)) {
          mappedFields = streamDefinition.ingest.classic.field_overrides ?? {};
        }

        // Compute unmapped fields by sampling documents and comparing against
        // mapped + inherited fields (same approach as the unmapped_fields route)
        const allMappedFieldNames = new Set([
          ...Object.keys(mappedFields),
          ...Object.keys(inheritedFields),
        ]);

        let unmappedFields: string[] = [];
        try {
          const sampleResponse = await esClient.search({
            index: name,
            size: UNMAPPED_FIELDS_SAMPLE_SIZE,
            sort: [{ '@timestamp': { order: 'desc' as const } }],
            _source: true,
          });

          const docs = sampleResponse.hits.hits
            .map((hit) => hit._source as Record<string, unknown>)
            .filter(Boolean);

          if (docs.length > 0) {
            const sourceFields = extractSourceFields(docs);
            unmappedFields = [...sourceFields]
              .filter((field) => !allMappedFieldNames.has(field))
              .sort();
          }
        } catch (e) {
          logger.debug(`Could not sample documents for unmapped fields in ${name}: ${e.message}`);
        }

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                stream: name,
                mappedFields,
                ...(Object.keys(inheritedFields).length > 0 ? { inheritedFields } : {}),
                unmappedFields,
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
