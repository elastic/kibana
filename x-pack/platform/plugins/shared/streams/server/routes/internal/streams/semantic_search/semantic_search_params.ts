/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Streams } from '@kbn/streams-schema';
import type { DocumentAnalysis } from '@kbn/ai-tools';
import { describeDataset } from '@kbn/ai-tools';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ElasticsearchClient } from '@kbn/core/server';
import { generateSemanticSearchData } from '@kbn/streams-ai';
import moment from 'moment';

type ModelType = 'elser' | 'e5';
const currentModelType: ModelType = 'elser';
export const META_LAYER_INDEX = 'semantic-meta-layer';
interface MappingField {
  name: string;
  type: string;
  isSemantic?: boolean;
}

// Mappings
const mappingFields: MappingField[] = [
  { name: 'name', type: 'text', isSemantic: true },
  { name: 'description', type: 'text', isSemantic: true },
  { name: 'tags', type: 'keyword' },
  { name: 'fields', type: 'keyword' },
  { name: 'asset_type', type: 'keyword' },
  { name: 'asset_id', type: 'keyword' },
  { name: 'index_patterns', type: 'keyword' },
  { name: 'es_queries', type: 'keyword' },
];

const modelMap: Record<
  ModelType,
  { inferenceEndpoint: string; modelId: string; semanticTextMapping: object }
> = {
  elser: {
    inferenceEndpoint: '/_inference/sparse_embedding/elser-model',
    modelId: '.elser_model_2',
    semanticTextMapping: {
      type: 'semantic_text',

      inference_id: 'elser-model',
    },
  },
  e5: {
    inferenceEndpoint: '/_inference/text_embedding/e5-model',
    modelId: '.multilingual-e5-small',
    semanticTextMapping: {
      type: 'semantic_text',
      inference_id: 'e5-model',
      index_options: {
        dense_vector: {
          type: 'bbq_hnsw',
          ef_construction: 100,
        },
      },
    },
  },
};

export const getMappings = (modelType: ModelType): { properties: Record<string, object> } => ({
  properties: mappingFields.reduce<Record<string, object>>((props, field) => {
    props[field.name] = { type: field.type };

    if (field.isSemantic) {
      props[field.name] = { ...props[field.name], copy_to: `${field.name}_vector` };
      props[`${field.name}_vector`] = modelMap[modelType].semanticTextMapping;
    }

    return props;
  }, {}),
});

export const ensureMetaLayerIndex = async (
  esClient: ElasticsearchClient,
  modelType: ModelType = currentModelType
): Promise<void> => {
  const indexExists = await esClient.indices.exists({ index: META_LAYER_INDEX });

  if (indexExists) {
    await esClient.indices.delete({ index: META_LAYER_INDEX });
  }

  await esClient.indices.create({
    index: META_LAYER_INDEX,
    mappings: getMappings(modelType),
  });
};

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
  const { description, tags, fields } = GENERATE_LLM_FIELDS
    ? await generateSemanticSearchData({
        analysis,
        inferenceClient,
        streamName: stream.name,
      })
    : { description: stream.description, ...getTagsAndFieldsFromAnalysis(analysis) };

  return {
    name: stream.name,
    description,
    tags,
    fields,
    asset_type: 'stream',
    asset_id: stream.name,
    index_patterns: [],
    es_queries: [],
  };
};

const getTagsAndFieldsFromAnalysis = (
  analysis: DocumentAnalysis
): { tags: string[]; fields: string[] } => {
  const tags: Set<string> = new Set();
  const fields: Set<string> = new Set();
  for (const field of analysis.fields) {
    fields.add(field.name);
    if (field.values.length < 100) {
      for (const value of field.values) {
        if (typeof value === 'string') {
          tags.add(String(value));
        }
      }
    }
  }
  return {
    tags: Array.from(tags),
    fields: Array.from(fields),
  };
};
