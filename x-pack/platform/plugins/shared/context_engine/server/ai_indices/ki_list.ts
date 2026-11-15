/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { isEsqlUnknownIndexError } from '@kbn/storage-adapter';
import { toOptionalKiLifecycleStatus } from '../../common/ki_lifecycle_status';
import type { KiLifecycleStatus } from '../../common/step_types/ki';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { MAX_KI_TYPE_FILTER_COUNT, takeTopKiTypeCounts } from '../../common/ki_type_counts';
import type { KiListItem, ListKisResponse } from '../../common/http_api/knowledge_indicators';

const KI_LIFECYCLE_STATUS_FIELD = 'governance.lifecycle.status';
/** Normalized lifecycle column: unset stored values become `active`. */
const KI_LIFECYCLE_STATUS_ALIAS = 'lifecycle_status';

/** Columns the list reads. Each is guarded by a schema probe since AI indices vary in shape. */
const KI_LIST_FIELDS = [
  'id',
  '@timestamp',
  'updated_at',
  'type',
  'title',
  'description',
  'expires_at',
  KI_LIFECYCLE_STATUS_FIELD,
] as const;
type KiListField = (typeof KI_LIST_FIELDS)[number];

export interface GetKisOptions {
  dest: AiIndexDest;
  size: number;
  type?: string;
  /** Fuzzy full-text search over indexed title and description columns. */
  query?: string;
  /** When omitted, non-deleted KIs only (unset status counts as active). */
  lifecycleStatuses?: KiLifecycleStatus[];
}

const EMPTY: ListKisResponse = { kis: [], total: 0, summary: { total: 0, counts_by_type: [] } };

const toRecords = (response: ESQLSearchResponse): Array<Record<string, unknown>> =>
  response.values.map((row) =>
    Object.fromEntries(response.columns.map((column, i) => [column.name, row[i]]))
  );

const toOptionalString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const toKiListItem = (row: Record<string, unknown>): KiListItem => {
  const { _index: index, id, type, title, updated_at: updatedAt, expires_at: expiresAt } = row;
  const updatedAtValue = toOptionalString(updatedAt);
  const expiresAtValue = toOptionalString(expiresAt);
  const lifecycleStatus = toOptionalKiLifecycleStatus(row[KI_LIFECYCLE_STATUS_ALIAS]) ?? 'active';
  return {
    id: String(id),
    index: String(index),
    ...(typeof type === 'string' ? { type } : {}),
    ...(typeof title === 'string' ? { title } : {}),
    ...(updatedAtValue !== undefined ? { updated_at: updatedAtValue } : {}),
    ...(expiresAtValue !== undefined ? { expires_at: expiresAtValue } : {}),
    lifecycle_status: lifecycleStatus,
  };
};

const lifecycleStatusEvalClause = (has: (field: KiListField) => boolean): string =>
  has(KI_LIFECYCLE_STATUS_FIELD)
    ? `EVAL ${KI_LIFECYCLE_STATUS_ALIAS} = COALESCE(${KI_LIFECYCLE_STATUS_FIELD}, "active")`
    : `EVAL ${KI_LIFECYCLE_STATUS_ALIAS} = "active"`;

const lifecycleFilterClause = (lifecycleStatuses?: KiLifecycleStatus[]): string[] => {
  if (lifecycleStatuses === undefined) {
    return [`WHERE ${KI_LIFECYCLE_STATUS_ALIAS} != "deleted"`];
  }
  if (lifecycleStatuses.length === 0) {
    return ['WHERE FALSE'];
  }
  const values = lifecycleStatuses.map((status) => `"${status}"`).join(', ');
  return [`WHERE ${KI_LIFECYCLE_STATUS_ALIAS} IN (${values})`];
};

const searchFilterClause = (has: (field: KiListField) => boolean, query?: string): string[] => {
  if (query === undefined) {
    return [];
  }
  const matches: string[] = [];
  if (has('title')) {
    matches.push('MATCH(title, ?searchQuery, {"fuzziness":"AUTO", "boost": 2})');
  }
  if (has('description')) {
    matches.push('MATCH(description, ?searchQuery, {"fuzziness":"AUTO"})');
  }
  if (matches.length === 0) {
    return ['WHERE FALSE'];
  }
  return [`WHERE (${matches.join(' OR ')})`];
};

const listQueryParams = (type?: string, query?: string) => {
  const params: Array<{ type: string } | { searchQuery: string }> = [];
  if (type !== undefined) {
    params.push({ type });
  }
  if (query !== undefined) {
    params.push({ searchQuery: query });
  }
  return params.length > 0 ? { params } : {};
};

/** A dest value may be a comma-separated list of index expressions. */
const destExpressions = (destValue: string): string[] =>
  destValue
    .split(',')
    .map((expression) => expression.trim())
    .filter((expression) => expression.length > 0);

const fromSources = (expressions: string[]): string =>
  expressions.map((expression) => JSON.stringify(expression)).join(', ');

const probeQuery = (expression: string): string =>
  `FROM ${JSON.stringify(expression)} METADATA _id, _index\n| LIMIT 0`;

/** The mapped columns of one index expression, or undefined when it resolves to nothing. */
export const probeColumns = async (
  esClient: ElasticsearchClient,
  expression: string,
  options?: { requestTimeout?: number }
): Promise<string[] | undefined> => {
  try {
    const probe = await esClient.esql.query({ query: probeQuery(expression) }, options);
    return (probe as unknown as ESQLSearchResponse).columns.map(({ name }) => name);
  } catch (error) {
    if (isEsqlUnknownIndexError(error)) {
      return undefined;
    }
    throw error;
  }
};

const getRowsSort = (query: string | undefined, hasTimestampColumn: boolean): string => {
  if (query !== undefined) {
    return hasTimestampColumn
      ? 'SORT _score DESC, revision_time DESC, id ASC'
      : 'SORT _score DESC, id ASC';
  }
  return hasTimestampColumn ? 'SORT revision_time DESC, id ASC' : 'SORT id ASC';
};

/**
 * Keeps only the latest revision by `@timestamp` for each logical id.
 * On an index dest the same id may exist in several backing indices, so those are distinct KIs.
 * Documents without a timestamp sort first, and `_id` breaks timestamp ties.
 */
export const latestRevisionPipeline = (
  dest: AiIndexDest,
  has: (field: 'id' | '@timestamp') => boolean
): string[] => {
  const key = dest.type === 'data_stream' ? 'id' : '_index, id';
  return [
    has('id') ? 'EVAL id = COALESCE(id, _id)' : 'EVAL id = _id',
    ...(has('@timestamp')
      ? [
          'EVAL revision_time = COALESCE(@timestamp, TO_DATETIME("1970-01-01T00:00:00Z"))',
          `INLINE STATS latest = MAX(revision_time) BY ${key}`,
          'WHERE revision_time == latest',
          `INLINE STATS latest_doc = MAX(_id) BY ${key}`,
          'WHERE _id == latest_doc',
        ]
      : []),
  ];
};

/** One row per KI, filtered by lifecycle status. */
const currentKisQuery = (
  dest: AiIndexDest,
  sources: string[],
  has: (field: KiListField) => boolean,
  lifecycleStatuses?: KiLifecycleStatus[],
  query?: string
): string =>
  [
    `FROM ${fromSources(sources)} ${
      query !== undefined ? 'METADATA _id, _index, _score' : 'METADATA _id, _index'
    }`,
    ...latestRevisionPipeline(dest, has),
    lifecycleStatusEvalClause(has),
    ...lifecycleFilterClause(lifecycleStatuses),
    ...searchFilterClause(has, query),
    ...(has('type') ? [] : ['EVAL type = TO_STRING(NULL)']),
    ...(has('title') ? [] : ['EVAL title = TO_STRING(NULL)']),
    ...(has('updated_at') ? [] : ['EVAL updated_at = TO_STRING(NULL)']),
    ...(has('expires_at') ? [] : ['EVAL expires_at = TO_STRING(NULL)']),
  ].join('\n| ');

export const getKis = async (
  esClient: ElasticsearchClient,
  { dest, size, type, query, lifecycleStatuses }: GetKisOptions
): Promise<ListKisResponse> => {
  // Zero-row probes resolve the mapped columns under the caller's own read privilege; an
  // expression that resolves to nothing is left out so the rest of the dest still lists.
  const expressions = destExpressions(dest.value);
  const probes = await Promise.all(
    expressions.map(async (expression) => ({
      expression,
      columns: await probeColumns(esClient, expression),
    }))
  );
  const sources = probes.filter(({ columns }) => columns !== undefined);
  if (sources.length === 0) {
    return EMPTY;
  }
  const columns = new Set(sources.flatMap(({ columns: names }) => names ?? []));
  const has = (field: KiListField) => columns.has(field);
  const base = currentKisQuery(
    dest,
    sources.map(({ expression }) => expression),
    has,
    lifecycleStatuses,
    query
  );
  const filterParams = listQueryParams(type, query);
  const keepFields = [
    '_index',
    'id',
    'type',
    'title',
    'updated_at',
    'expires_at',
    KI_LIFECYCLE_STATUS_ALIAS,
  ].join(', ');

  const rowsSort = getRowsSort(query, has('@timestamp'));

  const rowsQuery = [
    base,
    ...(type !== undefined ? ['WHERE type == ?type'] : []),
    rowsSort,
    `KEEP ${keepFields}`,
    `LIMIT ${size}`,
  ].join('\n| ');
  // Exact counts, independent of how many type buckets exist.
  const totalsQuery = [
    base,
    type !== undefined
      ? 'STATS total = COUNT(*), filtered = COUNT(*) WHERE type == ?type'
      : 'STATS total = COUNT(*)',
  ].join('\n| ');
  const bucketsQuery = [
    base,
    'WHERE type IS NOT NULL',
    'STATS count = COUNT(*) BY type',
    'SORT count DESC, type ASC',
    `LIMIT ${MAX_KI_TYPE_FILTER_COUNT}`,
  ].join('\n| ');
  const bucketsParams = listQueryParams(undefined, query);

  const [rows, totals, buckets] = await Promise.all([
    size > 0 ? esClient.esql.query({ query: rowsQuery, ...filterParams }) : undefined,
    esClient.esql.query({ query: totalsQuery, ...filterParams }),
    esClient.esql.query({ query: bucketsQuery, ...bucketsParams }),
  ]);

  const [totalRow] = toRecords(totals as unknown as ESQLSearchResponse);
  const totalAll = Number(totalRow?.total ?? 0);
  const total = type === undefined ? totalAll : Number(totalRow?.filtered ?? 0);
  const countsByType = takeTopKiTypeCounts(
    toRecords(buckets as unknown as ESQLSearchResponse).map((row) => ({
      type: String(row.type),
      count: Number(row.count),
    }))
  );

  return {
    kis: rows ? toRecords(rows as unknown as ESQLSearchResponse).map(toKiListItem) : [],
    total,
    summary: { total: totalAll, counts_by_type: countsByType },
  };
};
