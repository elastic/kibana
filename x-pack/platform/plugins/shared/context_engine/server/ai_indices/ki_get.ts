/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import type { GetKiResponse, KiDocument } from '../../common/http_api/knowledge_indicators';
import { KiNotFoundError } from './errors';

const LENIENT_INDEX_OPTIONS = {
  ignore_unavailable: true,
  allow_no_indices: true,
} as const;

/**
 * Matches a KI by its `id` field. Documents written before `id` existed are
 * matched by `_id` instead, so a revision's `_id` never resolves on its own.
 */
export const kiIdQuery = (kiId: string) => ({
  bool: {
    should: [
      { term: { id: kiId } },
      { bool: { filter: [{ ids: { values: [kiId] } }], must_not: [{ exists: { field: 'id' } }] } },
    ],
    minimum_should_match: 1,
  },
});

export interface GetKiOptions {
  aiIndexId: string;
  dest: AiIndexDest;
  index: string;
  kiId: string;
}

/**
 * Resolves a KI by {@link kiIdQuery}. On an index dest the caller's backing
 * index disambiguates pattern dests; on a data stream the latest revision may
 * live in any backing index, so the whole stream is searched.
 */
export const getKi = async (
  esClient: ElasticsearchClient,
  { aiIndexId, dest, index, kiId }: GetKiOptions
): Promise<GetKiResponse> => {
  const response = await esClient.search<KiDocument>({
    index: dest.value,
    ...LENIENT_INDEX_OPTIONS,
    query: {
      bool: {
        filter: [
          kiIdQuery(kiId),
          ...(dest.type === 'data_stream' ? [] : [{ term: { _index: index } }]),
        ],
      },
    },
    sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }, { _doc: { order: 'desc' } }],
    size: 1,
  });

  const { _id, _source: document } = response.hits.hits[0] ?? {};
  if (_id === undefined || document === undefined) {
    throw new KiNotFoundError(aiIndexId, kiId);
  }

  return { id: typeof document.id === 'string' ? document.id : _id, document };
};
