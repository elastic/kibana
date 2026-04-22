/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { IndexFieldType, MappingField } from '@kbn/agent-builder-genai-utils';
import { otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';
import { getIndexFields } from '@kbn/agent-builder-genai-utils';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';

const getIndexMappingsSchema = z.object({
  indices: z
    .array(z.string())
    .min(1)
    .describe('List of indices, aliases or datastreams to retrieve mappings for.'),
  raw: z
    .boolean()
    .default(false)
    .describe('Whether to return the raw mapping tree instead of the summarized fields.'),
});

const formatField = (field: MappingField): string => {
  const description = field.meta.description ? ` ${field.meta.description}` : '';
  return `- ${field.path} [${field.type}]${description}`;
};

export const getIndexMappingsTool = (): BuiltinToolDefinition<typeof getIndexMappingsSchema> => {
  return {
    id: platformCoreTools.getIndexMapping,
    type: ToolType.builtin,
    description: 'Retrieve mappings for the specified index or indices.',
    schema: getIndexMappingsSchema,
    handler: async ({ indices, raw }, { esClient }) => {
      // getIndexFields transparently handles the local-vs-CCS split:
      //  - local indices use _mapping API (full mapping tree in rawMapping)
      //  - CCS indices use batched _field_caps API (flat field list)
      const indexFields = await getIndexFields({
        indices,
        esClient: esClient.asCurrentUser,
      });

      const results = [];

      if (raw) {
        // Entries with a rawMapping (concrete indices + data streams):
        // return full mapping tree for richer LLM context.
        const mappingEntries = Object.entries(indexFields).filter(([, v]) => v.rawMapping);
        if (mappingEntries.length > 0) {
          results.push(
            otherResult({
              mappings: Object.fromEntries(
                mappingEntries.map(([idx, v]) => [idx, { mappings: v.rawMapping }])
              ),
              indices: mappingEntries.map(([idx]) => idx),
              resource_types_by_index: Object.fromEntries(
                mappingEntries.map(([idx, v]) => [idx, v.type])
              ) as Record<string, IndexFieldType>,
            })
          );
        }
        // Entries without a rawMapping (aliases, index patterns, CCS):
        // return flattened field lists.
        const fieldListEntries = Object.entries(indexFields).filter(([, v]) => !v.rawMapping);
        if (fieldListEntries.length > 0) {
          results.push(
            otherResult({
              indices: fieldListEntries.map(([idx]) => idx),
              fields_by_index: Object.fromEntries(
                fieldListEntries.map(([idx, v]) => [
                  idx,
                  { fields: v.fields.map(({ path, type }) => ({ path, type })) },
                ])
              ),
              resource_types_by_index: Object.fromEntries(
                fieldListEntries.map(([idx, v]) => [idx, v.type])
              ) as Record<string, IndexFieldType>,
            })
          );
        }
      } else {
        results.push(
          otherResult({
            indices: Object.entries(indexFields).map(([idx]) => idx),
            fields_by_index: Object.fromEntries(
              Object.entries(indexFields).map(([idx, v]) => [
                idx,
                v.fields.map(formatField).join('\n'),
              ])
            ),
            resource_types_by_index: Object.fromEntries(
              Object.entries(indexFields).map(([idx, v]) => [idx, v.type])
            ) as Record<string, IndexFieldType>,
          })
        );
      }

      return { results };
    },
    tags: [],
  };
};
