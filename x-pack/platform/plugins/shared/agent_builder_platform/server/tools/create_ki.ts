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

const createKiSchema = z.object({
  ai_index_id: z
    .string()
    .describe("ID of the registered AI index to write to, e.g. 'nightshift'"),
  id: z
    .string()
    .describe('Stable unique identity for this knowledge item (used for upserts/deletes)'),
  type: kiTypeEnum.describe('Discriminator for the knowledge item type'),
  title: z.string().describe('Short human-readable title'),
  description: z.string().describe('Full description / body of the knowledge item'),
  tags: z.array(z.string()).optional().describe('Optional tags for categorisation'),
});

export const createKiTool = (): BuiltinToolDefinition<typeof createKiSchema> => {
  return {
    id: platformCoreTools.createKi,
    type: ToolType.builtin,
    description:
      'Write a new knowledge item document to a registered AI index. ' +
      'The server automatically stamps @timestamp and space_id so the document is correctly scoped.',
    schema: createKiSchema,
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
        logger.debug(`create_ki: indexed '${id}' into '${dest}'`);
        return {
          results: [createOtherResult({ status: 'created', id })],
        };
      } catch (error) {
        logger.error(
          `create_ki failed for '${id}': ${error instanceof Error ? error.message : String(error)}`
        );
        return {
          results: [
            createErrorResult(
              `Failed to create knowledge item: ${error instanceof Error ? error.message : String(error)}`
            ),
          ],
        };
      }
    },
    tags: [],
  };
};
