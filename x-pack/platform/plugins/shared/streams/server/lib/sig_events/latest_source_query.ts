/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery, type ComposerSortShorthand } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import {
  type CommonSearchOptions,
  type PaginatedResponse,
  type PaginatedSearchOptions,
} from './query_utils';
import { runEsqlQuery } from './run_esql_query';

export const andWhere = (
  current: ESQLAstExpression | undefined,
  next: ESQLAstExpression
): ESQLAstExpression => {
  return current ? esql.exp`${current} AND ${next}` : next;
};

export const inFilter = ({
  where,
  field,
  values,
}: {
  where: ESQLAstExpression | undefined;
  field: string;
  values: string[] | undefined;
}): ESQLAstExpression | undefined => {
  if (!values?.length) return where;
  return andWhere(where, esql.exp`${esql.col(field)} IN (${values.map((v) => esql.str(v))})`);
};

// TODO: Remove `IS NULL` fallback once workflows write `kibana.space_ids` on every document.
export const fromIndexForSpace = ({
  index,
  space,
  columns,
}: {
  index: string;
  space: string;
  columns?: string[];
}): ComposerQuery => {
  const base = columns ? esql.from([index], columns) : esql.from([index]);
  return base.where`${esql.col('kibana.space_ids')} == ${space} OR ${esql.col(
    'kibana.space_ids'
  )} IS NULL`;
};

export const applyTimeRange = ({
  query,
  from,
  to,
}: {
  query: ComposerQuery;
  from?: string;
  to?: string;
}): ComposerQuery => {
  let q = query;
  if (from !== undefined) {
    const fromIso = from;
    q = q.where`@timestamp >= TO_DATETIME(${{ fromIso }})`;
  }
  if (to !== undefined) {
    const toIso = to;
    q = q.where`@timestamp <= TO_DATETIME(${{ toIso }})`;
  }
  return q;
};

export type LatestSourceGroupBy = string | [string, string] | [string, string, string];

export type LatestSourceWhereCondition = ESQLAstExpression;

export const latestSourceFrom = (index: string, space: string): ComposerQuery =>
  esql.from([index], ['_id', '_source']).where`\`kibana.space_ids\` == ${space}`;

export const withTimeRange = (
  query: ComposerQuery,
  options: CommonSearchOptions
): ComposerQuery => {
  let next = query;
  if (options.from !== undefined) {
    next = next.where`@timestamp >= TO_DATETIME(${esql.str(options.from)})`;
  }
  if (options.to !== undefined) {
    next = next.where`@timestamp <= TO_DATETIME(${esql.str(options.to)})`;
  }
  return next;
};

export const withWhere = (
  query: ComposerQuery,
  condition?: LatestSourceWhereCondition
): ComposerQuery => {
  if (!condition) {
    return query;
  }
  return query.where`${condition}`;
};

interface RunLatestSourceEsqlQueryArgs {
  esClient: ElasticsearchClient;
  space: string;
  options: CommonSearchOptions;
  index: string;
  where?: ESQLAstExpression;
  sort?: ComposerSortShorthand[];
  groupBy: string;
}

const buildGroupByCols = (groupBy: LatestSourceGroupBy) => {
  if (typeof groupBy === 'string') {
    return [esql.col(groupBy)];
  }
  return groupBy.map((field) => esql.col(field));
};

/**
 * Two-stage `INLINE STATS` reduction that keeps the latest revision per
 * group: first by `MAX(@timestamp)`, then by `MAX(_id)` as a tiebreaker
 * when multiple events share the same timestamp.
 */
export const pickLatestPerGroup = (
  query: ComposerQuery,
  groupBy: LatestSourceGroupBy
): ComposerQuery => {
  const groupByCols = buildGroupByCols(groupBy);

  return query.pipe`INLINE STATS latest_ts = MAX(@timestamp) BY ${groupByCols}`
    .where`@timestamp == latest_ts`.pipe`INLINE STATS tiebreaker_id = MAX(_id) BY ${groupByCols}`
    .where`_id == tiebreaker_id`;
};

/**
 * Apply a `SORT` clause when at least one sort key is provided.
 */
export const withSort = (query: ComposerQuery, sort?: ComposerSortShorthand[]): ComposerQuery => {
  if (!sort?.length) {
    return query;
  }
  return query.sort(sort[0], ...sort.slice(1));
};

/**
 * Run the composed query, locate the `_source` column in the response,
 * and decode each row by stripping the `kibana` envelope (added by
 * `IDataStreamClient` on write) so consumers see the typed payload only.
 */
export const executeAndDecodeSource = async <T>(
  esClient: ElasticsearchClient,
  query: ComposerQuery
): Promise<{ hits: T[] }> => {
  const response = await runEsqlQuery(esClient, query.print('basic'));
  if (!response) {
    return { hits: [] };
  }

  const sourceIdx = response.columns.findIndex((c) => c.name === '_source');
  if (sourceIdx === -1) {
    return { hits: [] };
  }

  return {
    hits: response.values.map((row) => {
      const source = (row[sourceIdx] ?? {}) as Record<string, unknown>;
      // `kibana.space_ids` is added by IDataStreamClient on write; strip the
      // whole `kibana` object so consumers only see the typed payload.
      const { kibana: _kibana, ...rest } = source;
      return rest as T;
    }),
  };
};

const executeEsqlQuery = async <T>({
  esClient,
  query,
}: {
  esClient: ElasticsearchClient;
  query: ComposerQuery;
}): Promise<T[]> => (await executeAndDecodeSource<T>(esClient, query)).hits;

export const runLatestSourceEsqlQuery = async <T>({
  esClient,
  space,
  options,
  index,
  where,
  sort,
  groupBy,
}: RunLatestSourceEsqlQueryArgs): Promise<{ hits: T[] }> => {
  let query = latestSourceFrom(index, space);
  query = withTimeRange(query, options);
  if (where) query = withWhere(query, where);
  query = pickLatestPerGroup(query, groupBy);
  const sortArgs: ComposerSortShorthand[] = sort ?? [['@timestamp', 'DESC']];
  query = withSort(query, sortArgs);
  query = query.keep('_source');
  return executeAndDecodeSource<T>(esClient, query);
};

const executeCount = async (
  esClient: ElasticsearchClient,
  query: ComposerQuery
): Promise<number> => {
  const countQuery = query.pipe`STATS total = COUNT(*)`.keep('total');
  const response = await runEsqlQuery(esClient, countQuery.print());
  if (!response) {
    return 0;
  }
  const countIdx = response.columns.findIndex((c) => c.name === 'total');
  if (countIdx === -1 || response.values.length === 0) {
    return 0;
  }
  return (response.values[0][countIdx] as number) ?? 0;
};

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;

interface RunPaginatedLatestSourceEsqlQueryArgs {
  esClient: ElasticsearchClient;
  space: string;
  options: PaginatedSearchOptions;
  index: string;
  where?: ESQLAstExpression;
  sort?: ComposerSortShorthand[];
  groupBy: LatestSourceGroupBy;
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

  const deduped = pickLatestPerGroup(
    withWhere(withTimeRange(latestSourceFrom(index, space), options), where),
    groupBy
  );

  const sortArgs: ComposerSortShorthand[] = sort ?? [['@timestamp', 'DESC']];
  const dataQuery = withSort(deduped, sortArgs)
    .limit(page * perPage)
    .keep('_source');

  const [total, result] = await Promise.all([
    executeCount(esClient, deduped),
    executeAndDecodeSource<T>(esClient, dataQuery),
  ]);

  const start = (page - 1) * perPage;
  const hits = start >= result.hits.length ? [] : result.hits.slice(start, start + perPage);

  return { hits, page, perPage, total };
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
  const query = latestSourceFrom(index, space).where`${esql.col(idField)} == ${esql.str(idValue)}`
    .sort(['@timestamp', 'ASC'])
    .keep('_source');

  return executeAndDecodeSource<T>(esClient, query);
};

interface RunFindByIdsEsqlQueryArgs {
  esClient: ElasticsearchClient;
  space: string;
  index: string;
  idField: string;
  idValues: string[];
}

export const runFindByIdsEsqlQuery = async <T>({
  esClient,
  space,
  index,
  idField,
  idValues,
}: RunFindByIdsEsqlQueryArgs): Promise<{ hits: T[] }> => {
  if (idValues.length === 0) return { hits: [] };

  const where = inFilter({ where: undefined, field: idField, values: idValues });
  let query = fromIndexForSpace({ index, space, columns: ['_source'] });

  if (where) {
    query = query.where`${where}`;
  }
  query = query.sort(['@timestamp', 'ASC']);
  query = query.keep('_source');

  const hits = await executeEsqlQuery<T>({ esClient, query });
  return { hits };
};
