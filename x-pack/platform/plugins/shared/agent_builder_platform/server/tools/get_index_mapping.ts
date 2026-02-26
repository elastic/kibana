/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { getIndexFields } from '@kbn/agent-builder-genai-utils';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';

const getIndexMappingsSchema = z.object({
  indices: z.array(z.string()).min(1).describe('List of indices to retrieve mappings for.'),
});

export const getIndexMappingsTool = (): BuiltinToolDefinition<typeof getIndexMappingsSchema> => {
  return {
    id: platformCoreTools.getIndexMapping,
    type: ToolType.builtin,
    description: 'Retrieve mappings for the specified index or indices.',
    schema: getIndexMappingsSchema,
    handler: async ({ indices }, { esClient }) => {
      // getIndexFields transparently handles the local-vs-CCS split:
      //  - local indices use _mapping API (full mapping tree in rawMapping)
      //  - CCS indices use batched _field_caps API (flat field list)
      const indexFields = await getIndexFields({
        indices,
        esClient: esClient.asCurrentUser,
      });

      const results = [];

      // Local indices: return full mapping tree for richer LLM context
      const localEntries = Object.entries(indexFields).filter(([, v]) => v.rawMapping);
      if (localEntries.length > 0) {
        results.push({
          type: ToolResultType.other,
          data: {
            mappings: Object.fromEntries(
              localEntries.map(([idx, v]) => [idx, { mappings: v.rawMapping }])
            ),
            indices: localEntries.map(([idx]) => idx),
          },
        });
      }

      // Remote (CCS) indices: return flattened field lists
      const remoteEntries = Object.entries(indexFields).filter(([, v]) => !v.rawMapping);
      if (remoteEntries.length > 0) {
        results.push({
          type: ToolResultType.other,
          data: {
            fieldsByIndex: Object.fromEntries(
              remoteEntries.map(([idx, v]) => [
                idx,
                { fields: v.fields.map(({ path, type }) => ({ path, type })) },
              ])
            ),
            indices: remoteEntries.map(([idx]) => idx),
          },
        });
      }

      return { results };
    },
    tags: [],
  };
};
