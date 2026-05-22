/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQueryTagHole, type ComposerSortShorthand } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import {
  type CommonSearchOptions,
  type PaginatedResponse,
  type PaginatedSearchOptions,
} from './query_utils';

const isIndexNotFoundError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return (
      error.message.includes('verification_exception') && error.message.includes('Unknown index')
    );
  }
  return false;
};

const parseSourceResponse = <T>(response: ESQLSearchResponse): T[] => {
  const sourceIdx = response.columns.findIndex((c) => c.name === '_source');
  if (sourceIdx === -1) {
    return [];
  }

  return response.values.map((row) => {
    const source = (row[sourceIdx] ?? {}) as Record<string, unknown>;
    const { kibana: _kibana, ...rest } = source;
    return rest as T;
  });
};

const executeEsqlQuery = async <T>(esClient: ElasticsearchClient, query: string): Promise<T[]> => {
  let response: ESQLSearchResponse;
  try {
    response = (await esClient.esql.query({ query })) as ESQLSearchResponse;
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return [];
    }
    throw error;
  }

  return parseSourceResponse<T>(response);
};

export type LatestSourceWhereCondition = ESQLAstExpression & ComposerQueryTagHole;

interface RunLatestSourceEsqlQueryArgs {
  esClient: ElasticsearchClient;
  space: string;
  options: CommonSearchOptions;
  index: string;
  where?: LatestSourceWhereCondition;
  sort?: ComposerSortShorthand[];
  groupBy: string;
}

export const runLatestSourceEsqlQuery = async <T>({
  esClient,
  space,
  options,
  index,
  where,
  sort,
  groupBy,
}: RunLatestSourceEsqlQueryArgs): Promise<{ hits: T[] }> => {
  // TODO: Remove `IS NULL` fallback once workflows write `kibana.space_ids` on every document.
  let query = esql.from([index], ['_id', '_source'])
    .where`\`kibana.space_ids\` == ${space} OR \`kibana.space_ids\` IS NULL`;

  if (options.from !== undefined) {
    query = query.where`@timestamp >= TO_DATETIME(${esql.str(options.from)})`;
  }

  if (options.to !== undefined) {
    query = query.where`@timestamp <= TO_DATETIME(${esql.str(options.to)})`;
  }

  if (where) {
    query = query.where`${where}`;
  }

  // pick the latest events by group
  query = query.pipe`INLINE STATS latest_ts = MAX(@timestamp) BY ${esql.col(groupBy)}`
    .where`@timestamp == latest_ts`;

  // use _id as a tiebreak in case multiple events share the same timestamp
  query = query.pipe`INLINE STATS tiebreaker_id = MAX(_id) BY ${esql.col(groupBy)}`
    .where`_id == tiebreaker_id`;

  if (sort?.length) {
    query = query.sort(sort[0], ...sort.slice(1));
  }

  query = query.keep('_source');

  const hits = await executeEsqlQuery<T>(esClient, query.print());
  return { hits };
};

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;

interface RunPaginatedLatestSourceEsqlQueryArgs {
  esClient: ElasticsearchClient;
  space: string;
  options: PaginatedSearchOptions;
  index: string;
  where?: LatestSourceWhereCondition;
  sort?: ComposerSortShorthand[];
  groupBy: string;
}

export const runPaginatedLatestSourceEsqlQuery = async <T>({
  esClient,
  space,
  options,
  index,
  where,
  sort,
  groupBy,
}: RunPaginatedLatestSourceEsqlQueryArgs): Promise<PaginatedResponse<T>> => {
  const { hits } = await runLatestSourceEsqlQuery<T>({
    esClient,
    space,
    options,
    index,
    where,
    sort: sort ?? [['@timestamp', 'DESC']],
    groupBy,
  });

  const page = options.page ?? DEFAULT_PAGE;
  const perPage = options.perPage ?? DEFAULT_PER_PAGE;
  const total = hits.length;
  const start = (page - 1) * perPage;
  const paginatedHits = start >= total ? [] : hits.slice(start, start + perPage);

  return { hits: paginatedHits, page, perPage, total };
};

interface RunFindByIdEsqlQueryArgs {
  esClient: ElasticsearchClient;
  space: string;
  index: string;
  idField: string;
  idValue: string;
}

export const runFindByIdEsqlQuery = async <T>({
  esClient,
  space,
  index,
  idField,
  idValue,
}: RunFindByIdEsqlQueryArgs): Promise<{ hits: T[] }> => {
  // TODO: Remove `IS NULL` fallback once workflows write `kibana.space_ids` on every document.
  let query = esql.from([index], ['_source'])
    .where`\`kibana.space_ids\` == ${space} OR \`kibana.space_ids\` IS NULL`;

  query = query.where`${esql.col(idField)} == ${esql.str(idValue)}`;
  query = query.sort(['@timestamp', 'ASC']);
  query = query.keep('_source');

  const hits = await executeEsqlQuery<T>(esClient, query.print());
  return { hits };
};
