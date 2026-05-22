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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// esClient.esql.query() return type doesn't match ESQLSearchResponse.
// Known typing gap in the ES client — centralized here to avoid scattered assertions.
const queryEsql = async ({
  esClient,
  query,
}: {
  esClient: ElasticsearchClient;
  query: string;
}): Promise<ESQLSearchResponse> => (await esClient.esql.query({ query })) as ESQLSearchResponse;

const parseSourceResponse = <T>(response: ESQLSearchResponse): T[] => {
  const sourceIdx = response.columns.findIndex((c) => c.name === '_source');
  if (sourceIdx === -1) {
    return [];
  }

  return response.values.map((row) => {
    const rawSource = row[sourceIdx];
    if (!isRecord(rawSource)) {
      return {} as T;
    }
    // `kibana.space_ids` is added by IDataStreamClient on write; strip the
    // whole `kibana` object so consumers only see the typed payload.
    const { kibana: _kibana, ...rest } = rawSource;
    return rest as T;
  });
};

const executeEsqlQuery = async <T>({
  esClient,
  query,
}: {
  esClient: ElasticsearchClient;
  query: string;
}): Promise<T[]> => {
  try {
    return parseSourceResponse<T>(await queryEsql({ esClient, query }));
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return [];
    }
    throw error;
  }
};

const executeCountQuery = async ({
  esClient,
  query,
}: {
  esClient: ElasticsearchClient;
  query: string;
}): Promise<number> => {
  try {
    const response = await queryEsql({ esClient, query });
    const countIdx = response.columns.findIndex((c) => c.name === 'total');
    if (countIdx === -1 || response.values.length === 0) {
      return 0;
    }
    return (response.values[0][countIdx] as number) ?? 0;
  } catch (error) {
    if (isIndexNotFoundError(error)) {
      return 0;
    }
    throw error;
  }
};

export type LatestSourceWhereCondition = ESQLAstExpression & ComposerQueryTagHole;

interface BuildLatestSourceBaseQueryArgs {
  space: string;
  index: string;
  options: CommonSearchOptions;
  where?: LatestSourceWhereCondition;
  groupBy: string;
}

const buildLatestSourceBaseQuery = ({
  space,
  index,
  options,
  where,
  groupBy,
}: BuildLatestSourceBaseQueryArgs) => {
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

  return query;
};

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
  let query = buildLatestSourceBaseQuery({ space, index, options, where, groupBy });

  if (sort?.length) {
    query = query.sort(sort[0], ...sort.slice(1));
  }

  query = query.keep('_source');

  const hits = await executeEsqlQuery<T>({ esClient, query: query.print() });
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
  const page = options.page ?? DEFAULT_PAGE;
  const perPage = options.perPage ?? DEFAULT_PER_PAGE;
  const baseArgs = { space, index, options, where, groupBy };

  const countQuery = buildLatestSourceBaseQuery(baseArgs).pipe`STATS total = COUNT(*)`.keep(
    'total'
  );

  const sortArgs = sort ?? [['@timestamp', 'DESC'] satisfies ComposerSortShorthand];
  const dataQuery = buildLatestSourceBaseQuery(baseArgs)
    .sort(sortArgs[0], ...sortArgs.slice(1))
    .limit(page * perPage)
    .keep('_source');

  const [total, hits] = await Promise.all([
    executeCountQuery({ esClient, query: countQuery.print() }),
    executeEsqlQuery<T>({ esClient, query: dataQuery.print() }),
  ]);

  const start = (page - 1) * perPage;
  const paginatedHits = start >= hits.length ? [] : hits.slice(start, start + perPage);

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

  const hits = await executeEsqlQuery<T>({ esClient, query: query.print() });
  return { hits };
};
