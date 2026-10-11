/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexDest } from '../../common/http_api/ai_indices';
import type { GetKiResponse, KiDocument } from '../../common/http_api/knowledge_indicators';
import { KiNotFoundError } from './errors';

const LENIENT_INDEX_OPTIONS = {
  ignore_unavailable: true,
  allow_no_indices: true,
} as const;

/** Matches a KI by `id`, or by `_id` for documents written before `id` existed. */
export const kiIdQuery = (kiId: string) => ({
  bool: {
    should: [
      { term: { id: kiId } },
      { bool: { filter: [{ ids: { values: [kiId] } }], must_not: [{ exists: { field: 'id' } }] } },
    ],
    minimum_should_match: 1,
  },
});

const isDeleted = (document: KiDocument): boolean => {
  const governance = document.governance;
  const lifecycle =
    typeof governance === 'object' && governance !== null && !Array.isArray(governance)
      ? governance.lifecycle
      : undefined;
  return (
    typeof lifecycle === 'object' &&
    lifecycle !== null &&
    !Array.isArray(lifecycle) &&
    lifecycle.status === 'deleted'
  );
};

/** How many equal-timestamp revisions to consider when picking the current one. */
export const REVISION_TIE_WINDOW = 10;

interface RevisionHit {
  _id?: string;
  _source?: Record<string, unknown> | undefined;
  sort?: estypes.SortResults;
}

/**
 * Picks the current revision from hits sorted by `@timestamp` descending: among
 * the hits sharing the newest indexed timestamp, the greatest `_id`. Matches the
 * list's `MAX(_id)` tie-break so every read path agrees.
 */
export const pickCurrentRevision = <T extends RevisionHit>(hits: T[]): T | undefined => {
  const [newest] = hits;
  if (!newest) {
    return undefined;
  }
  const newestTimestamp = newest.sort?.[0];
  return hits
    .filter((hit) => hit.sort?.[0] === newestTimestamp)
    .reduce((current, hit) => ((hit._id ?? '') > (current._id ?? '') ? hit : current));
};

export interface GetKiOptions {
  aiIndexId: string;
  dest: AiIndexDest;
  index: string;
  kiId: string;
}

/** Fetches the current revision of a KI. */
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
    sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }],
    size: dest.type === 'data_stream' ? REVISION_TIE_WINDOW : 1,
  });

  const { _id, _source: document } = pickCurrentRevision(response.hits.hits) ?? {};
  if (_id === undefined || document === undefined || isDeleted(document)) {
    throw new KiNotFoundError(aiIndexId, kiId);
  }

  return { id: typeof document.id === 'string' ? document.id : _id, document };
};
