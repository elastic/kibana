/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { OnechatToolIds, OnechatToolTags } from '@kbn/onechat-common';
import type { RegisteredTool } from '@kbn/onechat-server';

const fulltextSearchSchema = z.object({
  term: z.string().describe('Term to search for'),
  field: z.string().describe('Field to perform fulltext search on'),
  index: z.string().describe('Index to search against'),
  size: z
    .number()
    .optional()
    .default(10)
    .describe('Number of documents to return. Defaults to 10.'),
});

export interface SearchFulltextResult {
  id: string;
  index: string;
  highlight: string[];
}

export interface SearchFulltextResponse {
  results: SearchFulltextResult[];
}

export const searchFulltextTool = (): RegisteredTool<
  typeof fulltextSearchSchema,
  SearchFulltextResponse
> => {
  return {
    id: OnechatToolIds.searchFulltext,
    description: 'Find documents based on a simple fulltext search.',
    schema: fulltextSearchSchema,
    handler: async ({ term, field, index, size }, { esClient }) => {
      return searchFulltext({ term, field, index, size, esClient: esClient.asCurrentUser });
    },
    meta: {
      tags: [OnechatToolTags.retrieval],
    },
  };
};

export const searchFulltext = async ({
  term,
  field,
  index,
  size,
  esClient,
}: {
  term: string;
  field: string;
  index: string;
  size: number;
  esClient: ElasticsearchClient;
}): Promise<SearchFulltextResponse> => {
  const response = await esClient.search<any>({
    index,
    size,
    query: {
      match: {
        [field]: term,
      },
    },
    highlight: {
      number_of_fragments: 5,
      fields: {
        [field]: {},
      },
    },
  });

  const results = response.hits.hits.map<SearchFulltextResult>((hit) => {
    return {
      id: hit._id!,
      index: hit._index!,
      highlight: hit.highlight?.[field] || [hit._source[field]],
    };
  });

  return { results };
};
