/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { isEsqlUnknownIndexError } from '@kbn/storage-adapter';
import { MAX_KI_TYPE_FILTER_COUNT, takeTopKiTypeCounts } from '../../common/ki_type_counts';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { DEFAULT_KI_LIST_LIFECYCLE_STATUSES } from '../../common/ki_list_lifecycle';
import type { KiLifecycleStatus } from '../../common/step_types/ki';
import type { KiListItem, ListKisResponse } from '../../common/http_api/knowledge_indicators';

/** Columns the list reads. Each is guarded by a schema probe since AI indices vary in shape. */
const KI_LIST_FIELDS = [
  'id',
  '@timestamp',
  'type',
  'title',
  'updated_at',
  'governance.lifecycle.status',
] as const;
type KiListField = (typeof KI_LIST_FIELDS)[number];

export interface GetKisOptions {
  dest: AiIndexDest;
  size: number;
  type?: string;
  lifecycleStatuses?: KiLifecycleStatus[];
}

const ACTIVE_LIFECYCLE_FILTER =
  'governance.lifecycle.status IS NULL OR governance.lifecycle.status != "deleted"';

const lifecycleStatusFilterClause = (
  lifecycleStatuses: KiLifecycleStatus[],
  hasLifecycleField: boolean
): string[] => {
  if (!hasLifecycleField) {
    return [];
  }
  const includeActive = lifecycleStatuses.includes('active');
  const includeDeleted = lifecycleStatuses.includes('deleted');
  if (includeActive && includeDeleted) {
    return [];
  }
  if (includeDeleted) {
    return ['WHERE governance.lifecycle.status == "deleted"'];
  }
  return [`WHERE ${ACTIVE_LIFECYCLE_FILTER}`];
};

const EMPTY: ListKisResponse = { kis: [], total: 0, summary: { total: 0, counts_by_type: [] } };

const toRecords = (response: ESQLSearchResponse): Array<Record<string, unknown>> =>
  response.values.map((row) =>
    Object.fromEntries(response.columns.map((column, i) => [column.name, row[i]]))
  );

const readLifecycleStatus = (row: Record<string, unknown>): KiLifecycleStatus | undefined => {
  if (!('governance.lifecycle.status' in row)) {
    return undefined;
  }
  const status = row['governance.lifecycle.status'];
  if (status === 'active' || status === 'deleted') {
    return status;
  }
  return 'active';
};

const toKiListItem = (row: Record<string, unknown>): KiListItem => {
  const { _index: index, id, type, title, updated_at: updatedAt } = row;
  const lifecycleStatus = readLifecycleStatus(row);
  return {
    id: String(id),
    index: String(index),
    ...(typeof type === 'string' ? { type } : {}),
    ...(typeof title === 'string' ? { title } : {}),
    ...(typeof updatedAt === 'string' ? { updatedAt } : {}),
    ...(lifecycleStatus !== undefined ? { lifecycleStatus } : {}),
  };
};

const keepListFields = (has: (field: KiListField) => boolean): string => {
  const fields = ['_index', 'id', 'type', 'title'];
  if (has('governance.lifecycle.status')) {
    fields.push('governance.lifecycle.status');
  }
  if (has('updated_at')) {
    fields.push('updated_at');
  }
  return `KEEP ${fields.join(', ')}`;
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
const probeColumns = async (
  esClient: ElasticsearchClient,
  expression: string
): Promise<string[] | undefined> => {
  try {
    const probe = await esClient.esql.query({ query: probeQuery(expression) });
    return (probe as unknown as ESQLSearchResponse).columns.map(({ name }) => name);
  } catch (error) {
    if (isEsqlUnknownIndexError(error)) {
      return undefined;
    }
    throw error;
  }
};

/**
 * One row per KI: the latest revision by `@timestamp` for each logical id,
 * optionally filtered by lifecycle status (default: active only). On an index dest the same
 * id may exist in several backing indices, so those are distinct KIs.
 * Documents without a timestamp sort first, and `_id` breaks timestamp ties.
 */
const currentKisQuery = (
  dest: AiIndexDest,
  sources: string[],
  has: (field: KiListField) => boolean,
  lifecycleStatuses: KiLifecycleStatus[]
): string => {
  const key = dest.type === 'data_stream' ? 'id' : '_index, id';
  return [
    `FROM ${fromSources(sources)} METADATA _id, _index`,
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
    ...lifecycleStatusFilterClause(lifecycleStatuses, has('governance.lifecycle.status')),
    ...(has('type') ? [] : ['EVAL type = TO_STRING(NULL)']),
    ...(has('title') ? [] : ['EVAL title = TO_STRING(NULL)']),
  ].join('\n| ');
};

export const getKis = async (
  esClient: ElasticsearchClient,
  { dest, size, type, lifecycleStatuses = DEFAULT_KI_LIST_LIFECYCLE_STATUSES }: GetKisOptions
): Promise<ListKisResponse> => {
  const statuses = [...new Set(lifecycleStatuses)];
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
    statuses
  );
  const typeParams = type !== undefined ? { params: [{ type }] } : {};

  const rowsQuery = [
    base,
    ...(type !== undefined ? ['WHERE type == ?type'] : []),
    has('@timestamp') ? 'SORT revision_time DESC, id ASC' : 'SORT id ASC',
    keepListFields(has),
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

  const [rows, totals, buckets] = await Promise.all([
    size > 0 ? esClient.esql.query({ query: rowsQuery, ...typeParams }) : undefined,
    esClient.esql.query({ query: totalsQuery, ...typeParams }),
    esClient.esql.query({ query: bucketsQuery }),
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
