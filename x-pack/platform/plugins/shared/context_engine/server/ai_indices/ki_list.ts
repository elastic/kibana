/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { MAX_KI_TYPE_FILTER_COUNT, takeTopKiTypeCounts } from '../../common/ki_type_counts';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import type { KiListItem, ListKisResponse } from '../../common/http_api/knowledge_indicators';

/** Columns the list reads. Each is guarded by field caps since AI indices vary in shape. */
const KI_LIST_FIELDS = [
  'id',
  '@timestamp',
  'type',
  'title',
  'governance.lifecycle.status',
] as const;
type KiListField = (typeof KI_LIST_FIELDS)[number];

export interface GetKisOptions {
  dest: AiIndexDest;
  size: number;
  type?: string;
}

const EMPTY: ListKisResponse = { kis: [], total: 0, summary: { total: 0, counts_by_type: [] } };

const toRecords = (response: ESQLSearchResponse): Array<Record<string, unknown>> =>
  response.values.map((row) =>
    Object.fromEntries(response.columns.map((column, i) => [column.name, row[i]]))
  );

const toKiListItem = (row: Record<string, unknown>): KiListItem => {
  const { _index: index, id, type, title } = row;
  return {
    id: String(id),
    index: String(index),
    ...(typeof type === 'string' ? { type } : {}),
    ...(typeof title === 'string' ? { title } : {}),
  };
};

/**
 * One row per KI: the latest revision by `@timestamp` for each logical id,
 * excluding KIs whose lifecycle status is deleted. On an index dest the same
 * id may exist in several backing indices, so those are distinct KIs.
 */
const currentKisQuery = (dest: AiIndexDest, has: (field: KiListField) => boolean): string =>
  [
    `FROM ${JSON.stringify(dest.value)} METADATA _id, _index`,
    has('id') ? 'EVAL id = COALESCE(id, _id)' : 'EVAL id = _id',
    ...(has('@timestamp')
      ? [
          `INLINE STATS latest = MAX(@timestamp) BY ${
            dest.type === 'data_stream' ? 'id' : '_index, id'
          }`,
          'WHERE @timestamp == latest',
        ]
      : []),
    ...(has('governance.lifecycle.status')
      ? ['WHERE governance.lifecycle.status IS NULL OR governance.lifecycle.status != "deleted"']
      : []),
    ...(has('type') ? [] : ['EVAL type = TO_STRING(NULL)']),
    ...(has('title') ? [] : ['EVAL title = TO_STRING(NULL)']),
  ].join('\n| ');

export const getKis = async (
  esClient: ElasticsearchClient,
  { dest, size, type }: GetKisOptions
): Promise<ListKisResponse> => {
  const caps = await esClient.fieldCaps({
    index: dest.value,
    fields: [...KI_LIST_FIELDS],
    ignore_unavailable: true,
    allow_no_indices: true,
  });
  if (caps.indices.length === 0) {
    return EMPTY;
  }
  const has = (field: KiListField) => Object.keys(caps.fields[field] ?? {}).length > 0;
  const base = currentKisQuery(dest, has);
  const typeParams = type !== undefined ? { params: [{ type }] } : {};

  const rowsQuery = [
    base,
    ...(type !== undefined ? ['WHERE type == ?type'] : []),
    has('@timestamp') ? 'SORT @timestamp DESC, id ASC' : 'SORT id ASC',
    'KEEP _index, id, type, title',
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
