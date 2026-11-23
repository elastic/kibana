/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { RECALL_AI_INDEX_PREFIX, RECALL_ALL_AI_INDICES } from '../../common/constants';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import type { RecallResult } from '../../common/http_api/memory_recall';
import type { AiIndexDataReadServiceApi } from '../ai_indices/data_read_service';
import type { RecallStore } from './types';

type KiAttributes = Record<string, unknown>;

interface KiRow {
  index: string;
  docId: string;
  result: RecallResult;
}

/** Lexical and semantic matches over shared KIs and the user's own, fused. */
export const buildAiIndexRecallQuery = ({
  dests,
  limit,
}: {
  dests: string[];
  limit: number;
}): string =>
  [
    `FROM ${dests.join(', ')} METADATA _id, _index, _score`,
    '| WHERE user_id IS NULL OR user_id == ?user_id',
    '| FORK',
    `    ( WHERE MATCH(title, ?query) OR MATCH(description, ?query) OR MATCH(content, ?query) | SORT _score DESC | LIMIT ${limit} )`,
    `    ( WHERE MATCH(title.semantic, ?query) OR MATCH(description.semantic, ?query) OR MATCH(content.semantic, ?query) | SORT _score DESC | LIMIT ${limit} )`,
    '| FUSE',
    '| SORT _score DESC, _id ASC',
    '| KEEP id, _id, _index, content, @timestamp',
    `| LIMIT ${limit}`,
  ].join('\n');

/** A data stream row carries its backing index name, `.ds-<stream>-<date>-<generation>`. */
const sourceOf = (index: string, aiIndices: AiIndexItem[]): string => {
  const aiIndex = aiIndices.find(({ dest }) =>
    dest.value.split(',').some((value) => index === value || index.startsWith(`.ds-${value}-`))
  );
  return aiIndex ? `${RECALL_AI_INDEX_PREFIX}${aiIndex.id}` : 'ai_index';
};

const keyOf = (index: string, docId: string) => `${index}/${docId}`;

/** `attributes` is a flattened field, so it is read from `_source`. */
const fetchAttributes = async (
  esClient: ElasticsearchClient,
  rows: KiRow[]
): Promise<Map<string, KiAttributes>> => {
  const indices = [...new Set(rows.map(({ index }) => index))];
  const { hits } = await esClient.search<{ attributes?: KiAttributes }>({
    index: indices,
    size: rows.length * indices.length,
    _source: ['attributes'],
    query: { ids: { values: rows.map(({ docId }) => docId) } },
  });
  return new Map(
    hits.hits.flatMap(({ _index: index, _id: docId, _source: source }) =>
      docId !== undefined && source?.attributes
        ? [[keyOf(index, docId), source.attributes] as const]
        : []
    )
  );
};

export const createAiIndexRecallStore = ({
  esClient,
  dataReadService,
}: {
  esClient: ElasticsearchClient;
  dataReadService: Pick<AiIndexDataReadServiceApi, 'list' | 'query'>;
}): RecallStore => ({
  source: 'ai_index',
  search: async ({ query, limit, userId, aiIndexIds = [] }) => {
    const aiIndices = await dataReadService.list(
      aiIndexIds.includes(RECALL_ALL_AI_INDICES) ? undefined : aiIndexIds
    );
    if (aiIndices.length === 0) {
      return [];
    }
    const { columns, values } = await dataReadService.query({
      query: buildAiIndexRecallQuery({
        dests: aiIndices.map(({ dest }) => dest.value),
        limit,
      }),
      params: { query, user_id: userId },
      limit,
    });
    const [id, docId, index, content, timestamp] = [
      'id',
      '_id',
      '_index',
      'content',
      '@timestamp',
    ].map((name) => columns.findIndex((column) => column.name === name));
    const rows = values.flatMap((row): KiRow[] =>
      typeof row[content] === 'string'
        ? [
            {
              index: String(row[index]),
              docId: String(row[docId]),
              result: {
                id: String(row[id] ?? row[docId]),
                source: sourceOf(String(row[index]), aiIndices),
                ...(typeof row[timestamp] === 'string' && { date: row[timestamp] }),
                content: row[content],
              },
            },
          ]
        : []
    );
    if (rows.length === 0) {
      return [];
    }
    const attributes = await fetchAttributes(esClient, rows);
    return rows.map(({ index: rowIndex, docId: rowDocId, result }) => {
      const stored = attributes.get(keyOf(rowIndex, rowDocId));
      return stored ? { ...result, attributes: stored } : result;
    });
  },
});
