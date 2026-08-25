/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult, createOtherResult } from '@kbn/agent-builder-server';

// TODO(POC): Replace with context engine registry lookup once the start contract exposes it.
const DEST_BY_INDEX_ID: Readonly<Record<string, string>> = {
  nightshift: 'ai-index-ds-nightshift',
};

const kiTypeEnum = z.enum(['feature', 'query', 'memory', 'significant_event']);

const updateKiSchema = z.object({
  ai_index_id: z
    .string()
    .describe("ID of the registered AI index to write to, e.g. 'nightshift'"),
  id: z.string().describe('Stable unique identity of the knowledge item to upsert'),
  type: kiTypeEnum.describe('Discriminator for the knowledge item type'),
  title: z.string().describe('Short human-readable title'),
  description: z.string().describe('Full description / body of the knowledge item'),
  tags: z.array(z.string()).optional().describe('Optional tags for categorisation'),
});

export const updateKiTool = (): BuiltinToolDefinition<typeof updateKiSchema> => {
  return {
    id: platformCoreTools.updateKi,
    type: ToolType.builtin,
    description:
      'Upsert a knowledge item by ID in a registered AI index. ' +
      'The server automatically stamps @timestamp and space_id.',
    schema: updateKiSchema,
    handler: async (
      { ai_index_id, id, type, title, description, tags },
      { esClient, spaceId, logger }
    ) => {
      const dest = DEST_BY_INDEX_ID[ai_index_id];
      if (!dest) {
        return {
          results: [createErrorResult(`Unknown ai_index_id: '${ai_index_id}'.`)],
        };
      }

      const doc = {
        '@timestamp': new Date().toISOString(),
        id,
        type,
        title,
        description,
        space_id: spaceId,
        ...(tags !== undefined && { tags }),
      };

      try {
        await esClient.asInternalUser.index({ index: dest, id, document: doc });
        logger.debug(`update_ki: upserted '${id}' into '${dest}'`);
        return {
          results: [createOtherResult({ status: 'updated', id })],
        };
      } catch (error) {
        logger.error(
          `update_ki failed for '${id}': ${error instanceof Error ? error.message : String(error)}`
        );
        return {
          results: [
            createErrorResult(
              `Failed to update knowledge item: ${error instanceof Error ? error.message : String(error)}`
            ),
          ],
        };
      }
    },
    tags: [],
  };
};
