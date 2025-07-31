/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
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
}: {
  term: string;
  fields: MappingField[];
  index: string;
  size: number;
  esClient: ElasticsearchClient;
}): Promise<PerformMatchSearchResponse> => {
  const textFields = fields.filter((field) => field.type === 'text');
  const semanticTextFields = fields.filter((field) => field.type === 'semantic_text');

  const response = await esClient.search<any>({
    index,
    size,
    retriever: {
      rrf: {
        rank_window_size: size * 2,
        retrievers: [
          ...(textFields.length > 0
            ? [
                {
                  standard: {
                    query: {
                      multi_match: {
                        query: term,
                        fields: textFields.map((field) => field.path),
                      },
                    },
                  },
                },
              ]
            : []),
          ...semanticTextFields.map((field) => {
            return {
              standard: {
                query: {
                  match: {
                    [field.path]: term,
                  },
                },
              },
            };
          }),
        ],
      },
    },
    highlight: {
      number_of_fragments: 5,
      fields: fields.reduce((memo, field) => ({ ...memo, [field.path]: {} }), {}),
    },
  });

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
