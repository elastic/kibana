/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

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
  fields: string[];
  index: string;
  size: number;
  esClient: ElasticsearchClient;
}): Promise<PerformMatchSearchResponse> => {
  const response = await esClient.search<any>({
    index,
    size,
    retriever: {
      rrf: {
        retrievers: fields.map((field) => {
          return {
            standard: {
              query: {
                match: {
                  [field]: term,
                },
              },
            },
          };
        }),
      },
    },
    highlight: {
      number_of_fragments: 5,
      fields: fields.reduce((memo, field) => ({ ...memo, [field]: {} }), {}),
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
