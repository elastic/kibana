/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { MappingField } from '@kbn/agent-builder-genai-utils';
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
    description: 'Retrieve mappings for indices, aliases or datastreams.',
    schema: getIndexMappingsSchema,
    handler: async ({ indices, raw }, { esClient }) => {
      // getIndexFields transparently handles the local-vs-CCS split:
      //  - local indices use _mapping API (full mapping tree in rawMapping)
      //  - CCS indices use batched _field_caps API (flat field list)
      const indexFields = await getIndexFields({
        indices,
        esClient: esClient.asCurrentUser,
      });

      const resources = Object.fromEntries(
        Object.entries(indexFields).map(([name, v]) => {
          if (raw && v.rawMapping) {
            return [name, { type: v.type, mappings: v.rawMapping }];
          }
          if (raw) {
            return [
              name,
              { type: v.type, fields: v.fields.map(({ path, type }) => ({ path, type })) },
            ];
          }
          return [name, { type: v.type, fields: v.fields.map(formatField).join('\n') }];
        })
      );

      return { results: [otherResult({ resources })] };
    },
    tags: [],
  };
};
