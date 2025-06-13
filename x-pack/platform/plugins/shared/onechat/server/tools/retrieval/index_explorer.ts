/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

import { z } from '@kbn/zod';
import { BaseMessageLike } from '@langchain/core/messages';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { OnechatToolIds, OnechatToolTags } from '@kbn/onechat-common';
import type { RegisteredTool, ScopedModel } from '@kbn/onechat-server';
import { listIndices } from './list_indices';
import { getIndexMappings } from './get_index_mapping';

const indexExplorerSchema = z.object({
  query: z.string().describe('A natural language query to infer which indices to use.'),
  limit: z
    .number()
    .optional()
    .describe('(optional) Limit the max number of indices to return. Defaults to 1.'),
  indexPattern: z
    .string()
    .optional()
    .describe('(optional) Index pattern to filter indices by. Defaults to *.'),
});

export interface RelevantIndex {
  indexName: string;
  mappings: MappingTypeMapping;
  reason: string;
}

export interface IndexExplorerResponse {
  indices: RelevantIndex[];
}

export const indexExplorerTool = (): RegisteredTool<
  typeof indexExplorerSchema,
  IndexExplorerResponse
> => {
  return {
    id: OnechatToolIds.indexExplorer,
    description: `List relevant indices and corresponding mappings based on a natural language query.

                  The 'indexPattern' parameter can be used to filter indices by a specific pattern, e.g. 'foo*'.
                  This should *only* be used if you know what you're doing (e.g. if the user explicitly specified a pattern).
                  Otherwise, leave it empty to list all indices.

                  *Example:*
                  User: "Show me my latest alerts"
                  You: call tool 'indexExplorer' with { query: 'indices containing alerts' }
                  Tool result: [{ indexName: '.alerts', mappings: {...} }]
                  `,
    schema: indexExplorerSchema,
    handler: async ({ query, indexPattern = '*', limit = 1 }, { esClient, modelProvider }) => {
      const model = await modelProvider.getDefaultModel();
      return indexExplorer({ query, indexPattern, limit, esClient: esClient.asCurrentUser, model });
    },
    meta: {
      tags: [OnechatToolTags.retrieval],
    },
  };
};

export const indexExplorer = async ({
  query,
  indexPattern = '*',
  limit = 1,
  esClient,
  model,
}: {
  query: string;
  indexPattern?: string;
  limit?: number;
  esClient: ElasticsearchClient;
  model: ScopedModel;
}): Promise<IndexExplorerResponse> => {
  const { chatModel } = model;

  const allIndices = await listIndices({
    pattern: indexPattern,
    esClient,
  });

  const indexSelectorModel = chatModel.withStructuredOutput(
    z.object({
      indices: z.array(
        z.object({
          indexName: z.string().describe('name of the index'),
          reason: z.string().describe('brief explanation of why this index could be relevant'),
        })
      ),
    })
  );

  const indexSelectorPrompt: BaseMessageLike[] = [
    [
      'user',
      `You are an AI assistant for the Elasticsearch company.
           based on a natural language query from the user, your task is to select up to ${limit} most relevant indices from a list of indices.

           *The query is:* ${query}

           *List of indices:*
           ${allIndices.map((index) => `- ${index.index}`).join('\n')}

           Based on those information, please return most relevant indices with your reasoning.
           Remember, you should select at maximum ${limit} indices.
           `,
    ],
  ];

  const { indices: selectedIndices } = await indexSelectorModel.invoke(indexSelectorPrompt);

  const mappings = await getIndexMappings({
    indices: selectedIndices.map((index) => index.indexName),
    esClient,
  });

  const relevantIndices: RelevantIndex[] = selectedIndices.map<RelevantIndex>(
    ({ indexName, reason }) => {
      return {
        indexName,
        reason,
        mappings: mappings[indexName].mappings,
      };
    }
  );

  return { indices: relevantIndices };
};
