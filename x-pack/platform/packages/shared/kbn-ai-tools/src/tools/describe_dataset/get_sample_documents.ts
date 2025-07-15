/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslFieldAndFormat, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { kqlQuery, rangeQuery } from '@kbn/es-query';

export function getSampleDocuments({
  esClient,
  index,
  start,
  end,
  kql,
  size = 1000,
  fields = [
    {
      field: '*',
      include_unmapped: true,
    },
  ],
  _source = false,
  timeout = '5s',
}: {
  esClient: ElasticsearchClient;
  index: string;
  start: number;
  end: number;
  kql?: string;
  size?: number;
  fields?: Array<QueryDslFieldAndFormat | string>;
  _source?: boolean;
  timeout?: string;
}) {
  return esClient
    .search<Record<string, any>>({
      index,
      size,
      track_total_hits: true,
      timeout,
      query: {
        bool: {
          must: [...kqlQuery(kql), ...rangeQuery(start, end)],
          should: [
            {
              function_score: {
                functions: [
                  {
                    random_score: {},
                  },
                ],
              },
            },
          ],
        },
      },
      sort: {
        _score: {
          order: 'desc',
        },
      },
      _source,
      fields,
    })
    .then((response) => ({
      hits: response.hits.hits as Array<SearchHit<Record<string, any>>>,
      total:
        typeof response.hits.total === 'number'
          ? response.hits.total!
          : response.hits.total?.value!,
    }));
}
