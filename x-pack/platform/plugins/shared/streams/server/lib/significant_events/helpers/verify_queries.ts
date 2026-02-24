/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { kqlQuery } from '@kbn/es-query';
import { BasicPrettyPrinter, Parser } from '@kbn/esql-language';
import { extractWhereExpression } from '../../helpers/esql_helpers';
import type { Streams } from '@kbn/streams-schema';
import { getIndexPatternsForStream } from '@kbn/streams-schema';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import pLimit from 'p-limit';
import { isKqlQueryValid, rangeQuery } from '../../../../common/query_helpers';

export interface Query {
  title: string;
  kql: string;
  esql?: string;
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

function isEsqlQueryValid(esql: string): boolean {
  try {
    const { errors } = Parser.parse(esql);
    return errors.length === 0;
  } catch {
    return false;
  }
}

function isNativeEsql(query: Query): boolean {
  return !query.kql && !!query.esql;
}

function buildEsqlCountQuery(esql: string, indices: string[]): string {
  const whereExpr = extractWhereExpression(esql);
  const from = `FROM ${indices.join(',')}`;
  const where = whereExpr ? `| WHERE ${BasicPrettyPrinter.expression(whereExpr)}` : '';

  return `${from} ${where} | STATS count = COUNT(*)`;
}

export async function verifyQueries(
  params: Params,
  dependencies: Dependencies
): Promise<VerifiedQueries> {
  const { queries, definition, start, end } = params;
  const { esClient, logger } = dependencies;

  const indices = getIndexPatternsForStream(definition);

  const validKqlQueries = queries.filter((q) => !isNativeEsql(q) && isKqlQueryValid(q.kql));
  const validEsqlQueries = queries.filter((q) => isNativeEsql(q) && isEsqlQueryValid(q.esql!));

  const validQueries = [...validKqlQueries, ...validEsqlQueries];

  if (!validQueries.length) {
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
          if (isNativeEsql(query)) {
            return esClient
              .esql('verify_query', {
                query: buildEsqlCountQuery(query.esql!, indices),
                filter: {
                  range: {
                    '@timestamp': {
                      gte: start,
                      lte: end,
                      format: 'epoch_millis',
                    },
                  },
                },
              })
              .then((response) => {
                const count =
                  response.values.length > 0 ? (response.values[0][0] as number) ?? 0 : 0;
                return { ...query, count };
              })
              .catch(() => {
                return { ...query, count: 0 };
              });
          }

          return esClient
            .search('verify_query', {
              track_total_hits: true,
              index: indices,
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
        index: indices,
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
        .map((query) => `- ${query.esql ?? query.kql}: ${query.count}`)
        .join('\n')}`;
    });
  }

  return {
    totalCount,
    queries: validQueriesWithCounts,
  };
}
