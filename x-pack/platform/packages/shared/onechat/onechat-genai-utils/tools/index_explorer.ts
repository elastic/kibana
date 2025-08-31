/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ScopedModel } from '@kbn/onechat-server';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { ListIndexBasicInfo } from './steps/list_indices';
import { listIndices } from './steps/list_indices';
import { getIndexMappings } from './steps/get_mappings';
import type { MappingField } from './utils/mappings';
import { cleanupMapping, flattenMappings } from './utils/mappings';

export interface RelevantIndex {
  indexName: string;
  mappings: MappingTypeMapping;
  reason: string;
}

export interface IndexExplorerResponse {
  indices: RelevantIndex[];
}

export const indexExplorer = async ({
  nlQuery,
  indexPattern = '*',
  limit = 1,
  esClient,
  model,
}: {
  nlQuery: string;
  indexPattern?: string;
  limit?: number;
  esClient: ElasticsearchClient;
  model: ScopedModel;
}): Promise<IndexExplorerResponse> => {
  const allIndices = await listIndices({
    pattern: indexPattern,
    showDetails: false,
    esClient,
  });

  const allMappings = await getIndexMappings({
    indices: allIndices.map((index) => index.index),
    esClient,
  });

  const cleanedMappings: Record<string, MappingTypeMapping> = {};
  for (const [indexName, mapping] of Object.entries(allMappings)) {
    cleanedMappings[indexName] = cleanupMapping(mapping.mappings);
  }

  const flattenedMappings: Record<string, MappingField[]> = {};
  for (const [indexName, mapping] of Object.entries(allMappings)) {
    flattenedMappings[indexName] = flattenMappings({ mappings: mapping.mappings });
  }

  const selectedIndices = await selectIndices({
    indices: allIndices,
    mappings: cleanedMappings,
    fields: flattenedMappings,
    nlQuery,
    model,
    limit,
  });

  const relevantIndices: RelevantIndex[] = selectedIndices.map<RelevantIndex>(
    ({ indexName, reason }) => {
      return {
        indexName,
        reason,
        mappings: cleanedMappings[indexName],
      };
    }
  );

  return { indices: relevantIndices };
};

export interface SelectedIndex {
  indexName: string;
  reason: string;
}

export const createIndexSelectorPrompt = ({
  indices,
  mappings,
  fields,
  nlQuery,
  limit = 1,
}: {
  indices: ListIndexBasicInfo[];
  mappings: Record<string, MappingTypeMapping>;
  fields: Record<string, MappingField[]>;
  nlQuery: string;
  limit?: number;
}): string => {
  /*
  Will result in blocks like:
  --------
  - my_index: A description of this index

  - other_index: Fields: foo, foo.bar, baz
  --------
   */
  const indicesAndDescriptions = indices
    .map((index) => {
      const indexMapping = mappings[index.index];
      const fieldPaths: string[] = fields[index.index].map((mappingField) => {
        return mappingField.path;
      });
      const description = indexMapping?._meta?.description || `Fields: ${fieldPaths.join(', ')}`;
      return `- ${index.index}: ${description}`;
    })
    .join('\n\n');

  return `You are an AI assistant for the Elasticsearch company.
       based on a natural language query from the user, your task is to select up to ${limit} most relevant indices from a list of indices.

       *The natural language query is:* ${nlQuery}

       *List of indices with their descriptions:*
       ${indicesAndDescriptions}

       Based on the natural language query and the index descriptions, please return the most relevant indices with your reasoning.
       Remember, you should select at maximum ${limit} indices.
       `;
};

const selectIndices = async ({
  indices,
  mappings,
  fields,
  nlQuery,
  model,
  limit = 1,
}: {
  indices: ListIndexBasicInfo[];
  mappings: Record<string, MappingTypeMapping>;
  fields: Record<string, MappingField[]>;
  nlQuery: string;
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

  const promptContent = createIndexSelectorPrompt({
    indices,
    mappings,
    fields,
    nlQuery,
    limit,
  });

  const { indices: selectedIndices } = await indexSelectorModel.invoke(promptContent);

  return selectedIndices;
};
