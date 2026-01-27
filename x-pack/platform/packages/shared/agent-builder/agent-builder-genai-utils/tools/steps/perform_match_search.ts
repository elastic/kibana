/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { MappingField } from '../utils/mappings';

export interface MatchResult {
  id: string;
  index: string;
  highlights: string[];
}

export interface PerformMatchSearchResponse {
  results: MatchResult[];
}

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
  const textFields = fields.filter((field) => field.type === 'text');
  const semanticTextFields = fields.filter((field) => field.type === 'semantic_text');
  const allSearchableFields = [...textFields, ...semanticTextFields];

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
                  {
                    multi_match: {
                      query: term,
                      minimum_should_match: '1<-1 3<49%',
                      type: 'cross_fields',
                      fields: textFields.map((field) => field.path),
                      boost: 1.5,
                    },
                  },
                  {
                    multi_match: {
                      query: term,
                      minimum_should_match: '1<-1 3<49%',
                      type: 'best_fields',
                      fuzziness: 'AUTO',
                      prefix_length: 2,
                      fields: textFields.map((field) => field.path),
                      boost: 2.0,
                    },
                  },
                  {
                    multi_match: {
                      query: term,
                      type: 'phrase',
                      slop: 3,
                      fields: textFields.map((field) => field.path),
                      boost: 3.0,
                    },
                  },
                  {
                    multi_match: {
                      query: term,
                      minimum_should_match: '1',
                      type: 'cross_fields',
                      fields: textFields.map((field) => field.path),
                      boost: 0.6,
                    },
                  }
                 ]
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
        fields: semanticTextFields.map((field) => field.path),
        query: term,
        rank_window_size: size * 2,
      },
    };
    retrievers.push(semanticRetriever);
  }

  const searchRequest: any = {
    index,
    size,
    retriever:
      retrievers.length > 1
        ? {
          rrf: {
            rank_window_size: size * 2,
            retrievers,
          },
        }
        : retrievers[0],
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
      `Elasticsearch search failed for index="${index}", term="${term}": ${
        error instanceof Error ? error.message : String(error)
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
