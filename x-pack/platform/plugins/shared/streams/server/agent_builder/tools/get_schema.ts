/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { Streams } from '@kbn/streams-schema';
import dedent from 'dedent';
import type { GetScopedClients } from '../../routes/types';
import { getUnmappedFields, UNMAPPED_SAMPLE_SIZE } from '../../lib/streams/helpers/unmapped_fields';
import {
  STREAMS_GET_SCHEMA_TOOL_ID as GET_SCHEMA,
  STREAMS_GET_STREAM_TOOL_ID as GET_STREAM,
  STREAMS_LIST_STREAMS_TOOL_ID as LIST_STREAMS,
} from './tool_ids';
import { classifyError } from './error_utils';

const getSchemaSchema = z.object({
  name: z.string().describe('Exact stream name, e.g. "logs.nginx"'),
});

export const createGetSchemaTool = ({
  getScopedClients,
}: {
  getScopedClients: GetScopedClients;
}): BuiltinToolDefinition<typeof getSchemaSchema> => ({
  id: GET_SCHEMA,
  type: ToolType.builtin,
  description: dedent(`
    Returns the schema of a stream: mapped fields (own and inherited) with their types, and unmapped fields detected from recent documents.

    **When to use:**
    - User asks "what fields does stream X have?"
    - User asks about field types, unmapped fields, or inherited mappings
    - Before querying documents, to understand available fields

    **When NOT to use:**
    - User wants a general stream overview — use ${GET_STREAM}
    - User wants data quality or lifecycle info — use the focused tool
  `),
  tags: ['streams'],
  schema: getSchemaSchema,
  handler: async ({ name }, { request }) => {
    try {
      const { streamsClient, scopedClusterClient } = await getScopedClients({ request });
      const esClient = scopedClusterClient.asCurrentUser;

      const [definition, ancestors, sampleDocs] = await Promise.all([
        streamsClient.getStream(name),
        streamsClient.getAncestors(name),
        esClient.search({
          index: name,
          sort: [{ '@timestamp': { order: 'desc' } }],
          size: UNMAPPED_SAMPLE_SIZE,
        }),
      ]);

      const mappedFields: Array<{ name: string; type: string; source: string }> = [];
      const mappedFieldNames = new Set<string>();

      if (Streams.WiredStream.Definition.is(definition)) {
        for (const [fieldName, fieldDef] of Object.entries(definition.ingest.wired.fields)) {
          mappedFields.push({
            name: fieldName,
            type: fieldDef.type || 'object',
            source: name,
          });
          mappedFieldNames.add(fieldName);
        }
      } else if (Streams.ClassicStream.Definition.is(definition)) {
        for (const [fieldName, fieldDef] of Object.entries(
          definition.ingest.classic.field_overrides || {}
        )) {
          mappedFields.push({
            name: fieldName,
            type: fieldDef.type || 'object',
            source: name,
          });
          mappedFieldNames.add(fieldName);
        }
      }

      for (const ancestor of ancestors) {
        for (const [fieldName, fieldDef] of Object.entries(ancestor.ingest.wired.fields)) {
          if (!mappedFieldNames.has(fieldName)) {
            mappedFields.push({
              name: fieldName,
              type: fieldDef.type || 'object',
              source: ancestor.name,
            });
            mappedFieldNames.add(fieldName);
          }
        }
      }

      const unmappedFields = getUnmappedFields({ definition, ancestors, sampleDocs });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              stream: name,
              mapped_fields: mappedFields,
              unmapped_fields: unmappedFields,
              total_mapped: mappedFields.length,
              total_unmapped: unmappedFields.length,
            },
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: `Failed to get schema for stream "${name}": ${message}`,
              stream: name,
              operation: 'get_schema',
              likely_cause: classifyError(err, LIST_STREAMS),
            },
          },
        ],
      };
    }
  },
});
