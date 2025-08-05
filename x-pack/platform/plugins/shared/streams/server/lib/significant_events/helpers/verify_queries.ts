/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { kqlQuery } from '@kbn/es-query';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import pLimit from 'p-limit';
import { rangeQuery } from '../../../routes/internal/esql/query_helpers';

interface Query {
  title: string;
  kql: string;
}

interface Params {
  queries: Query[];
  name: string;
  start: number;
  end: number;
}

interface Dependencies {
  esClient: TracedElasticsearchClient;
  logger: Logger;
}

interface VerifiedQueries {
  totalCount: number;
  queries: Array<
    Query & {
      count: number;
      ratio: number;
    }
  >;
}

export async function verifyQueries(
  params: Params,
  dependencies: Dependencies
): Promise<VerifiedQueries> {
  const { queries, name, start, end } = params;
  const { esClient, logger } = dependencies;

  const limiter = pLimit(10);
  const [queriesWithCounts, totalCount] = await Promise.all([
    Promise.all(
      queries.map((query) =>
        limiter(async () => {
          return esClient
            .search('verify_query', {
              track_total_hits: true,
              index: name,
              size: 0,
              timeout: '5s',
              query: {
                bool: {
                  filter: [...kqlQuery(query.kql), ...rangeQuery(start, end)],
                },
              },
            })
            .then((response) => ({ ...query, count: response.hits.total.value }));
        })
      )
    ),
    esClient
      .search('verify_query', {
        track_total_hits: true,
        index: name,
        size: 0,
        timeout: '5s',
      })
      .then((response) => response.hits.total.value),
  ]);

  if (queries.length) {
    logger.debug(() => {
      return `Ran queries: ${queriesWithCounts
        .map((query) => `- ${query.kql}: ${query.count}`)
        .join('\n')}`;
    });
  }

  return {
    totalCount,
    queries: queriesWithCounts.map((query) => ({
      ...query,
      ratio: query.count > 0 ? totalCount / query.count : 0,
    })),
  };
}
