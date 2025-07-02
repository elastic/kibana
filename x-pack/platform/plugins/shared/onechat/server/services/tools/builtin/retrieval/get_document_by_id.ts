/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { BuiltinToolIds, BuiltinTags } from '@kbn/onechat-common';
import type { RegisteredTool } from '@kbn/onechat-server';
import { getDocumentById, GetDocumentByIdResult } from '@kbn/onechat-genai-utils';

const getDocumentByIdSchema = z.object({
  id: z.string().describe('ID of the document to retrieve'),
  index: z.string().describe('Name of the index to retrieve the document from'),
});

export const getDocumentByIdTool = (): RegisteredTool<
  typeof getDocumentByIdSchema,
  GetDocumentByIdResult
> => {
  return {
    id: BuiltinToolIds.getDocumentById,
    description: 'Retrieve the full content (source) of a document based on its ID and index name.',
    schema: getDocumentByIdSchema,
    handler: async ({ id, index }, { esClient }) => {
      return getDocumentById({ id, index, esClient: esClient.asCurrentUser });
    },
    meta: {
      tags: [BuiltinTags.retrieval],
    },
  };
};
