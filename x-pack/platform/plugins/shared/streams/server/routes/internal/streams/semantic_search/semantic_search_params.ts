/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Streams } from '@kbn/streams-schema';
import { describeDataset } from '@kbn/ai-tools';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import { generateSemanticSearchData } from '@kbn/streams-ai';
import moment from 'moment';

interface SemanticSearchStreamDocument {
  name: string;
  description: string;
  tags: string[];
  fields: string[];
  asset_type: string;
  asset_id: string;
  index_patterns: string[];
  es_queries: string[];
}

const GENERATE_LLM_FIELDS = false;

export const getSearchQuery = (query: string): QueryDslQueryContainer => ({
  bool: {
    should: [
      {
        multi_match: {
          query,
          fields: ['name', 'description'],
        },
      },
      {
        term: {
          tags: query,
        },
      },
      { semantic: { query, field: 'name_vector' } },
      { semantic: { query, field: 'description_vector' } },
    ],
  },
});

export const getSemanticSearchStreamDocument = async ({
  stream,
  esClient,
  inferenceClient,
}: {
  stream: Streams.all.Definition;
  esClient: ElasticsearchClient;
  inferenceClient: BoundInferenceClient;
}): Promise<SemanticSearchStreamDocument> => {
  const end = moment().valueOf();
  // Do we care about data older than 30 days?
  const start = moment().subtract(30, 'days').valueOf();

  // Get the dataset analysis
  const analysis = await describeDataset({
    start,
    end,
    esClient,
    index: stream.name,
  });

  // Get the LLM generated description and tags based on the analysis
  const { description, tags } = GENERATE_LLM_FIELDS
    ? await generateSemanticSearchData({
        analysis,
        inferenceClient,
        streamName: stream.name,
      })
    : { description: stream.description, tags: [] };

  return {
    name: stream.name,
    description,
    tags,
    fields: [],
    asset_type: 'stream',
    asset_id: stream.name,
    index_patterns: [],
    es_queries: [],
  };
};
