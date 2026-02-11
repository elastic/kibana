/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import {
  getIndexMappings,
  isCcsTarget,
  getFieldsFromFieldCaps,
} from '@kbn/agent-builder-genai-utils';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';

const getIndexMappingsSchema = z.object({
  indices: z
    .array(z.string())
    .min(1)
    .describe(
      'List of indices to retrieve mappings for. Cross-cluster search (CCS) is supported: use cluster:index names (e.g. cluster:index1, remote:logs-*).'
    ),
});

export const getIndexMappingsTool = (): BuiltinToolDefinition<typeof getIndexMappingsSchema> => {
  return {
    id: platformCoreTools.getIndexMapping,
    type: ToolType.builtin,
    description:
      'Retrieve mappings for the specified index or indices. Cross-cluster search (CCS) is supported: indices can be CCS names (e.g. cluster:index1, cluster:index2).',
    schema: getIndexMappingsSchema,
    handler: async ({ indices }, { esClient }) => {
      // Partition indices into local and remote (CCS) groups.
      // The _mapping API does not support CCS, so remote indices use _field_caps instead.
      const localIndices = indices.filter((i) => !isCcsTarget(i));
      const remoteIndices = indices.filter((i) => isCcsTarget(i));

      const results = [];

      // Local indices: use _mapping API for full mapping tree
      if (localIndices.length > 0) {
        const mappings = await getIndexMappings({
          indices: localIndices,
          esClient: esClient.asCurrentUser,
        });
        results.push({
          type: ToolResultType.other,
          data: {
            mappings,
            indices: localIndices,
          },
        });
      }

      // Remote (CCS) indices: use _field_caps API (CCS-compatible fallback)
      if (remoteIndices.length > 0) {
        const fieldsByIndex: Record<string, { fields: Array<{ path: string; type: string }> }> =
          {};
        await Promise.all(
          remoteIndices.map(async (idx) => {
            const fields = await getFieldsFromFieldCaps({
              resource: idx,
              esClient: esClient.asCurrentUser,
            });
            fieldsByIndex[idx] = {
              fields: fields.map(({ path, type }) => ({ path, type })),
            };
          })
        );
        results.push({
          type: ToolResultType.other,
          data: {
            fieldsByIndex,
            indices: remoteIndices,
          },
        });
      }

      return { results };
    },
    tags: [],
  };
};
