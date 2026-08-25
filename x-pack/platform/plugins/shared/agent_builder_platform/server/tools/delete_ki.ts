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

const deleteKiSchema = z.object({
  ai_index_id: z.string().describe("ID of the registered AI index, e.g. 'nightshift'"),
  id: z.string().describe('Stable unique identity of the knowledge item to delete'),
});

export const deleteKiTool = (): BuiltinToolDefinition<typeof deleteKiSchema> => {
  return {
    id: platformCoreTools.deleteKi,
    type: ToolType.builtin,
    description: 'Hard-delete a knowledge item by ID from a registered AI index.',
    schema: deleteKiSchema,
    handler: async ({ ai_index_id, id }, { esClient, logger }) => {
      const dest = DEST_BY_INDEX_ID[ai_index_id];
      if (!dest) {
        return {
          results: [createErrorResult(`Unknown ai_index_id: '${ai_index_id}'.`)],
        };
      }

      try {
        await esClient.asInternalUser.delete({ index: dest, id });
        logger.debug(`delete_ki: deleted '${id}' from '${dest}'`);
        return {
          results: [createOtherResult({ status: 'deleted', id })],
        };
      } catch (error) {
        logger.error(
          `delete_ki failed for '${id}': ${error instanceof Error ? error.message : String(error)}`
        );
        return {
          results: [
            createErrorResult(
              `Failed to delete knowledge item: ${error instanceof Error ? error.message : String(error)}`
            ),
          ],
        };
      }
    },
    tags: [],
  };
};
