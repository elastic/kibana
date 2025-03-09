/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { KnowledgeBaseQueryContainer } from '.';
import { ML_INFERENCE_PREFIX } from './recall_from_search_connectors';

function wrapInShould(query: QueryDslQueryContainer[]): QueryDslQueryContainer {
  return {
    bool: {
      should: query,
      minimum_should_match: 1,
    },
  };
}

export function kbQueryToDsl(
  query: KnowledgeBaseQueryContainer,
  field: string,
  modelId: string
): QueryDslQueryContainer;

export function kbQueryToDsl(
  query: KnowledgeBaseQueryContainer,
  semanticTextFields: string[]
): QueryDslQueryContainer;

export function kbQueryToDsl(
  query: KnowledgeBaseQueryContainer,
  ...rest: [string[]] | [string, string]
): QueryDslQueryContainer {
  const fields = rest.length === 1 ? rest[0] : [rest[0]];

  if ('keyword' in query) {
    return wrapInShould([
      ...query.keyword.value.map((keyword) => ({
        multi_match: {
          fields: ['*'],
          query: keyword,
          boost: query.keyword.boost ?? 1,
        },
      })),
    ]);
  }

  return fields.length
    ? wrapInShould([
        ...fields.flatMap((field) => {
          if (rest.length === 2) {
            const modelId = rest[1];
            const vectorField = `${ML_INFERENCE_PREFIX}${field}_expanded.predicted_value`;
            const modelField = `${ML_INFERENCE_PREFIX}${field}_expanded.model_id`;
            return {
              bool: {
                should: [
                  {
                    sparse_vector: {
                      field: vectorField,
                      query: query.semantic.query,
                      inference_id: rest[1],
                      boost: query.semantic.boost ?? 1,
                    },
                  },
                ],
                minimum_should_match: 1,
                filter: [
                  {
                    term: {
                      [modelField]: modelId,
                    },
                  },
                ],
              },
            };
          }
          return {
            bool: {
              should: [
                {
                  semantic: {
                    query: query.semantic.query,
                    field,
                    boost: query.semantic.boost ?? 1,
                  },
                },
                {
                  match: {
                    [field]: {
                      query: query.semantic.query,
                      boost: Math.max(1, (query.semantic.boost ?? 2) - 1),
                    },
                  },
                },
              ],
              minimum_should_match: 1,
            },
          };
        }),
      ])
    : {
        match_all: {},
      };
}
