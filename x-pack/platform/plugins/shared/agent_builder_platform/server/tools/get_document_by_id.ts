/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import { getDocumentById } from '@kbn/agent-builder-genai-utils';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';

const getDocumentByIdSchema = z.object({
  id: z.string().describe('ID of the document to retrieve'),
  index: z.string().describe('Name of the index to retrieve the document from'),
});

export const getDocumentByIdTool = (): BuiltinToolDefinition<typeof getDocumentByIdSchema> => {
  return {
    id: platformCoreTools.getDocumentById,
    type: ToolType.builtin,
    description:
      'Retrieve the full content (source) of an Elasticsearch document based on its ID and index name.',
    schema: getDocumentByIdSchema,
    handler: async ({ id, index }, { esClient }) => {
      const result = await getDocumentById({ id, index, esClient: esClient.asCurrentUser });

      if (result.found) {
        return {
          results: [
            {
              type: ToolResultType.resource,
              data: {
                reference: {
                  id: result.id,
                  index: result.index,
                },
                partial: false,
                content: result._source,
              },
            },
          ],
        };
      }

      return {
        results: [
          createErrorResult({
            message: `Document with ID '${result.id}' not found in index '${result.index}'`,
            metadata: {
              id: result.id,
              index: result.index,
            },
          }),
        ],
      };
    },
    tags: [],
  };
};
