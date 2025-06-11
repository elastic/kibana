/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { OnechatToolIds, OnechatToolTags } from '@kbn/onechat-common';
import type { RegisteredTool } from '@kbn/onechat-server';

const searchDslSchema = z.object({
  query: z.any().describe('Elasticsearch DSL query to run (string or JSON object)'),
  index: z.string().describe('Index to search against'),
  size: z.number().optional().default(5).describe('Number of documents to return. Defaults to 5.'),
});

export interface SearchDslResult {
  id: string;
  index: string;
  source: unknown;
}

export interface SearchDslResponse {
  results: SearchDslResult[];
}

export const searchDslTool = (): RegisteredTool<typeof searchDslSchema, SearchDslResponse> => {
  return {
    id: OnechatToolIds.searchDsl,
    description: 'Run a DSL search query on one index and return matching documents.',
    schema: searchDslSchema,
    handler: async ({ query, index, size }, { esClient }) => {
      const parsedQuery = typeof query === 'string' ? JSON.parse(query) : query ?? {};
      return searchDsl({ query: parsedQuery, index, size, esClient: esClient.asCurrentUser });
    },
    meta: {
      tags: [OnechatToolTags.retrieval],
    },
  };
};

export const searchDsl = async ({
  query,
  index,
  size,
  esClient,
}: {
  query: QueryDslQueryContainer;
  index: string;
  size: number;
  esClient: ElasticsearchClient;
}): Promise<SearchDslResponse> => {
  const response = await esClient.search<any>({
    index,
    size,
    query,
  });

  const results = response.hits.hits.map<SearchDslResult>((hit) => {
    return {
      id: hit._id!,
      index: hit._index!,
      source: hit._source ?? {},
    };
  });

  return { results };
};
