/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { kqlQuery } from '@kbn/es-query';
import { getIndexPatternsForStream, type Streams } from '@kbn/streams-schema';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import pLimit from 'p-limit';
import { isKqlQueryValid, rangeQuery } from '../../../../common/query_helpers';

interface Query {
  title: string;
  kql: string;
}

interface Params {
  queries: Query[];
  definition: Streams.all.Definition;
  start: number;
  end: number;
}

interface Dependencies {
  esClient: TracedElasticsearchClient;
  logger: Logger;
}

export type VerifiedQuery = Query & { count: number };

export interface VerifiedQueries {
  totalCount: number;
  queries: Array<VerifiedQuery>;
}

export async function verifyQueries(
  params: Params,
  dependencies: Dependencies
): Promise<VerifiedQueries> {
  const { queries, definition, start, end } = params;
  const { esClient, logger } = dependencies;

  const validQueries = queries.filter((query) => isKqlQueryValid(query.kql));
  if (!queries.length) {
    return {
      totalCount: 0,
      queries: [],
    };
  }

  const limiter = pLimit(10);
  const [validQueriesWithCounts, totalCount] = await Promise.all([
    Promise.all(
      validQueries.map((query) =>
        limiter(async () => {
          return esClient
            .search('verify_query', {
              track_total_hits: true,
              index: getIndexPatternsForStream(definition),
              size: 0,
              timeout: '5s',
              query: { bool: { filter: [...kqlQuery(query.kql), ...rangeQuery(start, end)] } },
            })
            .then((response) => ({ ...query, count: response.hits.total.value }))
            .catch(() => {
              return { ...query, count: 0 };
            });
        })
      )
    ),
    esClient
      .search('verify_query', {
        track_total_hits: true,
        index: getIndexPatternsForStream(definition),
        size: 0,
        timeout: '5s',
      })
      .then((response) => response.hits.total.value)
      .catch(() => {
        return 0;
      }),
  ]);

  if (validQueriesWithCounts.length) {
    logger.debug(() => {
      return `Ran queries: ${validQueriesWithCounts
        .map((query) => `- ${query.kql}: ${query.count}`)
        .join('\n')}`;
    });
  }

  return {
    totalCount,
    queries: validQueriesWithCounts,
  };
}
