/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { KnowledgeBaseQueryContainer } from './types';

export const ML_INFERENCE_PREFIX = 'ml.inference.';

const MATCH_ALL_NO_SCORE = {
  bool: {
    filter: [
      {
        match_all: {},
      },
    ],
  },
};

export function kbQueryToSparseVector(
  query: KnowledgeBaseQueryContainer,
  fields: string[],
  modelId: string
): QueryDslQueryContainer {
  if ('keyword' in query) {
    return MATCH_ALL_NO_SCORE;
  }
  return {
    bool: {
      should: fields.map((field) => {
        const vectorField = `${ML_INFERENCE_PREFIX}${field}_expanded.predicted_value`;
        const modelField = `${ML_INFERENCE_PREFIX}${field}_expanded.model_id`;
        return {
          bool: {
            should: [
              {
                sparse_vector: {
                  field: vectorField,
                  query: query.semantic.query,
                  inference_id: modelId,
                  boost: query.semantic.boost ?? 1,
                },
              },
            ],
            filter: [
              {
                term: {
                  [modelField]: modelId,
                },
              },
            ],
          },
        };
      }),
    },
  };
}

export function kbQueryToDsl(
  query: KnowledgeBaseQueryContainer,
  textFields: string[]
): QueryDslQueryContainer {
  if ('keyword' in query) {
    return {
      // use multi_match to query both text and keyword fields
      multi_match: {
        fields: ['*'],
        query: query.keyword.value.join(' '),
        operator: 'OR',
        boost: query.keyword.boost ?? 1,
      },
    };
  }

  if (!textFields.length) {
    return MATCH_ALL_NO_SCORE;
  }

  return {
    bool: {
      should: textFields.map((field) => ({
        // multi_match doesn't work on semantic_text,
        // so we use match queries
        match: {
          [field]: {
            query: query.semantic.query,
            boost: query.semantic.boost,
          },
        },
      })),
    },
  };
}
