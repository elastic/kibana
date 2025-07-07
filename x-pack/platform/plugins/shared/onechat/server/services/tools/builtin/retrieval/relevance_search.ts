/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { BuiltinToolIds, BuiltinTags } from '@kbn/onechat-common';
import type { RegisteredTool } from '@kbn/onechat-server';
import { relevanceSearch } from '@kbn/onechat-genai-utils';

const relevanceSearchSchema = z.object({
  term: z.string().describe('Term to search for'),
  index: z
    .string()
    .optional()
    .describe(
      '(optional) Index to search against. If not provided, will use index explorer to find the best index to use.'
    ),
  fields: z
    .array(z.string())
    .optional()
    .describe(
      '(optional) Fields to perform fulltext search on. If not provided, will use all searchable fields.'
    ),
  size: z
    .number()
    .optional()
    .default(10)
    .describe('Number of documents to return. Defaults to 10.'),
});

export interface SearchFulltextResult {
  id: string;
  index: string;
  highlights: string[];
}

export interface SearchFulltextResponse {
  results: SearchFulltextResult[];
}

export const relevanceSearchTool = (): RegisteredTool<
  typeof relevanceSearchSchema,
  SearchFulltextResponse
> => {
  return {
    id: BuiltinToolIds.relevanceSearch,
    description: `Find relevant documents in an index based on a simple fulltext search.

    - The 'index' parameter can be used to specify which index to search against. If not provided, the tool will use the index explorer to find the best index to use.
    - The 'fields' parameter can be used to specify which fields to search on. If not provided, the tool will use all searchable fields.

    It is perfectly fine not to not specify both 'index' and 'fields'. Those should only be used when you already know about the index and fields you want to search on,
    e.g if the user explicitly specified them.`,
    schema: relevanceSearchSchema,
    handler: async ({ term, index, fields = [], size }, { esClient, modelProvider }) => {
      const model = await modelProvider.getDefaultModel();
      const result = await relevanceSearch({
        term,
        index,
        fields,
        size,
        model,
        esClient: esClient.asCurrentUser,
      });
      return {
        result,
      };
    },
    meta: {
      tags: [BuiltinTags.retrieval],
    },
  };
};
