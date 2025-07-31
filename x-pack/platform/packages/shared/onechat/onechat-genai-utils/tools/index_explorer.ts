/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessageLike } from '@langchain/core/messages';
import { z } from '@kbn/zod';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ScopedModel } from '@kbn/onechat-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ListIndexInfo, listIndices } from './steps/list_indices';
import { getIndexMappings } from './steps/get_mappings';

export interface RelevantIndex {
  indexName: string;
  mappings: MappingTypeMapping;
  reason: string;
}

export interface IndexExplorerResponse {
  indices: RelevantIndex[];
}

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
  const allIndices = await listIndices({
    pattern: indexPattern,
    esClient,
  });

  const selectedIndices = await selectIndices({
    indices: allIndices,
    query,
    model,
    limit,
  });

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

export interface SelectedIndex {
  indexName: string;
  reason: string;
}

const selectIndices = async ({
  indices,
  query,
  model,
  limit = 1,
}: {
  indices: ListIndexInfo[];
  query: string;
  model: ScopedModel;
  limit?: number;
}): Promise<SelectedIndex[]> => {
  const { chatModel } = model;
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
       ${indices.map((index) => `- ${index.index}`).join('\n')}

       Based on those information, please return most relevant indices with your reasoning.
       Remember, you should select at maximum ${limit} indices.
       `,
    ],
  ];

  const { indices: selectedIndices } = await indexSelectorModel.invoke(indexSelectorPrompt);

  return selectedIndices;
};
