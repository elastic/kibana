/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql, type ComposerQuery, type ComposerSortShorthand } from '@elastic/esql';
import type { ESQLAstExpression } from '@elastic/esql/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { getSourceColumnIndex, toEsqlRequest } from '../streams/helpers/esql';
import {
  type CommonSearchOptions,
  type PaginatedResponse,
  type PaginatedSearchOptions,
} from './query_utils';

export const isIndexNotFoundError = (error: unknown): boolean => {
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
// Uses `toEsqlRequest` so named-parameter holes (`${{ name: value }}`) are bound
// at the protocol level rather than inlined into the query string.
export const queryEsql = async ({
  esClient,
  query,
}: {
  esClient: ElasticsearchClient;
  query: ComposerQuery;
}): Promise<ESQLSearchResponse> =>
  (await esClient.esql.query(toEsqlRequest(query))) as ESQLSearchResponse;

// Converts a columnar ESQLSearchResponse into an array of plain objects keyed by column name.
export const esqlToObjects = <T extends Record<string, unknown>>(
  response: ESQLSearchResponse
): T[] =>
  response.values.map(
    (row) =>
      row.reduce<Record<string, unknown>>((acc, value, i) => {
        const col = response.columns[i];
        if (col) acc[col.name] = value;
        return acc;
      }, {}) as T
  );

const parseSourceResponse = <T>(response: ESQLSearchResponse): T[] => {
  const sourceIdx = getSourceColumnIndex(response);
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
  query: ComposerQuery;
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
  query: ComposerQuery;
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

interface BuildLatestSourceBaseQueryArgs {
  space: string;
  index: string;
  options: CommonSearchOptions;
  where?: ESQLAstExpression;
  groupBy: string;
}

const buildLatestSourceBaseQuery = ({
  space,
  index,
  options,
  where,
  groupBy,
}: BuildLatestSourceBaseQueryArgs) => {
  let query = applyTimeRange({
    query: fromIndexForSpace({ index, space, columns: ['_id', '_source'] }),
    from: options.from,
    to: options.to,
  });

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
  where?: ESQLAstExpression;
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

  const hits = await executeEsqlQuery<T>({ esClient, query });
  return { hits };
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
    executeCountQuery({ esClient, query: countQuery }),
    executeEsqlQuery<T>({ esClient, query: dataQuery }),
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
  let query = fromIndexForSpace({ index, space, columns: ['_source'] });

  query = query.where`${esql.col(idField)} == ${esql.str(idValue)}`;
  query = query.sort(['@timestamp', 'ASC']);
  query = query.keep('_source');

  const hits = await executeEsqlQuery<T>({ esClient, query });
  return { hits };
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
