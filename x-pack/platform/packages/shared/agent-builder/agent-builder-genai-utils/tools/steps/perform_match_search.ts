/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { MappingField } from '../utils/mappings';
import { operationAlertAuditActionMap } from '@kbn/alerting-plugin/server/lib';

export interface MatchResult {
  id: string;
  index: string;
  highlights: string[];
}

export interface PerformMatchSearchResponse {
  results: MatchResult[];
}

/**
 * Here, we're performing a hybrid search on all searchable fields, with limited
 * knowledge of the underlying datasets or schemas. 
 * 
 * We construct a lexical text query aimed at improving recall and precision 
 * given these limitations, and combine it with an RRF retriever using the 
 * simplified syntax. We try to balance final results from the lexical matches 
 * against semantic matches. 
 */
export const performMatchSearch = async ({
  term,
  fields,
  index,
  size,
  esClient,
  logger,
}: {
  term: string;
  fields: MappingField[];
  index: string;
  size: number;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<PerformMatchSearchResponse> => {
  const textFields = fields.filter((field) => field.type === 'text').map((field) => field.path);
  const semanticTextFields = fields.filter((field) => field.type === 'semantic_text').map((field) => field.path);
  const rank_window_size = Math.max(size * 2, 200);

  const retrievers: any[] = [];

  if (textFields.length > 0) {
    const textRetriever = {
      standard: {
        query: {
          bool: {
            must: [
              {
                bool: {
                  should: [
                    // This clause tries to maximize precision given
                    // the fact that queries skew toward natural language
                    {
                      multi_match: {
                        query: term,
                        minimum_should_match: '4<60%',
                        operator: 'and',
                        type: 'cross_fields',
                        fields: textFields,
                        boost: 2.0,
                      },
                    },
                    // This clause tries to maximize recall
                    {
                      multi_match: {
                        query: term,
                        minimum_should_match: '1<-1 3<49%',
                        operator: 'or',
                        type: 'cross_fields',
                        fields: textFields,
                        boost: 1.0,
                      },
                    },
                    // This clause is a catch-all with fuzziness/near-miss support
                    {
                      multi_match: {
                        query: term,
                        minimum_should_match: '1<-1 3<49%',
                        type: 'best_fields',
                        fuzziness: 'AUTO',
                        prefix_length: 2,
                        fields: textFields,
                        boost: 0.6,
                      },
                    },
                  ],
                  minimum_should_match: 1,
                }
              }
            ]
          }
        },
      },
    };
    retrievers.push(textRetriever);
  }

  if (semanticTextFields.length > 0) {
    const semanticRetriever = {
      rrf: {
        fields: semanticTextFields,
        query: term,
        rank_window_size: rank_window_size,
      },
    };
    retrievers.push(semanticRetriever);
  }

  const baseRetriever =
  retrievers.length > 1
    ? { rrf: { rank_window_size: rank_window_size, retrievers } }
    : retrievers[0];

// We're using a rescore retriever here in order to 
// maximize any exact lexical matches. We could consider
// removing this and simply doing an RRF or linear retriever, 
// potentually with weights.
const retriever = textFields.length > 0
  ? {
      rescorer: {
        retriever: baseRetriever,
        rescore: [
          {
            window_size: 200,
            query: {
              rescore_query: {
                multi_match: {
                  query: term,
                  type: 'phrase',
                  slop: 3,
                  fields: textFields,
                },
              },
              query_weight: 1.0,
              rescore_query_weight: 2.0,
            },
          },
        ],
      },
    }
  : baseRetriever;

// should replace `any` with `SearchRequest` type when the simplified retriever syntax is supported in @elastic/elasticsearch`
const searchRequest: any = {
  index,
  size,
  retriever,
  highlight: {
    number_of_fragments: 5,
    fields: fields.reduce((memo, field) => ({ ...memo, [field.path]: {} }), {}),
  },
};

  logger.debug(`Elasticsearch search request: ${JSON.stringify(searchRequest, null, 2)}`);

  let response;
  try {
    response = await esClient.search<any>(searchRequest);
  } catch (error) {
    logger.debug(
      `Elasticsearch search failed for index="${index}", term="${term}": ${error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }

  const results = response.hits.hits.map<MatchResult>((hit) => {
    return {
      id: hit._id!,
      index: hit._index!,
      highlights: Object.entries(hit.highlight ?? {}).reduce((acc, [field, highlights]) => {
        acc.push(...highlights);
        return acc;
      }, [] as string[]),
    };
  });

  return { results };
};
