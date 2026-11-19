/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RECALL_ALL_AI_INDICES } from '../../common/constants';
import { ENTITY_TYPE_PREFIX, FACT_TYPE_PREFIX } from '../../common/dreaming';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import type { RecallResult } from '../../common/http_api/memory_recall';
import type { AiIndexDataReadServiceApi } from '../ai_indices/data_read_service';
import type { RecallStore } from './types';

/** Lexical and semantic matches over dreamed KIs, fused. */
export const buildAiIndexRecallQuery = ({
  dests,
  limit,
  filterByUser,
}: {
  dests: string[];
  limit: number;
  filterByUser: boolean;
}): string =>
  [
    `FROM ${dests.join(', ')} METADATA _id, _index, _score`,
    `| WHERE STARTS_WITH(type, "${FACT_TYPE_PREFIX}") OR STARTS_WITH(type, "${ENTITY_TYPE_PREFIX}")`,
    ...(filterByUser ? ['| WHERE user_id IS NULL OR user_id == ?user_id'] : []),
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
  return aiIndex ? `ai_index:${aiIndex.id}` : 'ai_index';
};

export const createAiIndexRecallStore = (
  dataReadService: Pick<AiIndexDataReadServiceApi, 'list' | 'query'>
): RecallStore => ({
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
        filterByUser: userId !== undefined,
      }),
      params: { query, ...(userId !== undefined && { user_id: userId }) },
      limit,
    });
    const [id, docId, index, content, timestamp] = [
      'id',
      '_id',
      '_index',
      'content',
      '@timestamp',
    ].map((name) => columns.findIndex((column) => column.name === name));
    return values.flatMap((row): RecallResult[] =>
      typeof row[content] === 'string'
        ? [
            {
              id: String(row[id] ?? row[docId]),
              source: sourceOf(String(row[index]), aiIndices),
              content: row[content],
              ...(typeof row[timestamp] === 'string' && { date: row[timestamp] }),
            },
          ]
        : []
    );
  },
});
