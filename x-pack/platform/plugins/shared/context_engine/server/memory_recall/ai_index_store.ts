/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RECALL_CANDIDATES } from '../../common/constants';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import type { AiIndexDataReadServiceApi } from '../ai_indices/data_read_service';
import type { RecallCandidate, RecallStore } from './types';

const LIMIT = RECALL_CANDIDATES.ai_index;

/** Lexical and semantic matches, fused. */
export const buildAiIndexRecallQuery = (dests: string[]): string =>
  [
    `FROM ${dests.join(', ')} METADATA _id, _index, _score`,
    '| FORK',
    `    ( WHERE MATCH(title, ?query) OR MATCH(description, ?query) OR MATCH(content, ?query) | SORT _score DESC | LIMIT ${LIMIT} )`,
    `    ( WHERE MATCH(title.semantic, ?query) OR MATCH(description.semantic, ?query) OR MATCH(content.semantic, ?query) | SORT _score DESC | LIMIT ${LIMIT} )`,
    '| FUSE',
    '| SORT _score DESC, _id ASC',
    '| KEEP id, _id, _index, content, @timestamp',
    `| LIMIT ${LIMIT}`,
  ].join('\n');

/** A data stream row carries its backing index name, `.ds-<stream>-<date>-<generation>`. */
const aiIndexIdOf = (index: string, aiIndices: AiIndexItem[]): string | undefined =>
  aiIndices.find(({ dest }) =>
    dest.value.split(',').some((value) => index === value || index.startsWith(`.ds-${value}-`))
  )?.id;

export const createAiIndexRecallStore = (
  dataReadService: Pick<AiIndexDataReadServiceApi, 'list' | 'query'>
): RecallStore => ({
  source: 'ai_index',
  search: async ({ query, aiIndexIds }) => {
    const aiIndices = await dataReadService.list(aiIndexIds);
    if (aiIndices.length === 0) {
      return [];
    }
    const { columns, values } = await dataReadService.query({
      query: buildAiIndexRecallQuery(aiIndices.map(({ dest }) => dest.value)),
      params: { query },
      limit: LIMIT,
    });
    const [id, docId, index, content, timestamp] = [
      'id',
      '_id',
      '_index',
      'content',
      '@timestamp',
    ].map((name) => columns.findIndex((column) => column.name === name));
    return values.flatMap((row): RecallCandidate[] =>
      typeof row[content] === 'string'
        ? [
            {
              id: String(row[id] ?? row[docId]),
              source: 'ai_index',
              content: row[content],
              ...(typeof row[timestamp] === 'string' && { date: row[timestamp] }),
              ai_index_id: aiIndexIdOf(String(row[index]), aiIndices),
            },
          ]
        : []
    );
  },
});
