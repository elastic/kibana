/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import { readKiDocumentLifecycleStatus } from '../../common/ki_lifecycle_status';
import type { KiLifecycleStatus } from '../../common/step_types/ki';
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

const matchesLifecycleFilter = (
  document: KiDocument,
  lifecycleStatuses?: KiLifecycleStatus[]
): boolean => {
  if (lifecycleStatuses === undefined) {
    return readKiDocumentLifecycleStatus(document) !== 'deleted';
  }
  const status = readKiDocumentLifecycleStatus(document);
  if (status === undefined) {
    return lifecycleStatuses.includes('active');
  }
  return lifecycleStatuses.includes(status);
};

/** How many equal-timestamp revisions to consider when picking the current one. */
export const REVISION_TIE_WINDOW = 10;

type SearchHitForRevision = Omit<estypes.SearchHit, '_index'>;

/**
 * Picks the current revision from hits sorted by `@timestamp` descending: among
 * the hits sharing the newest indexed timestamp, the greatest `_id`. Matches the
 * list's `MAX(_id)` tie-break so every read path agrees.
 */
export const pickCurrentRevision = <T extends SearchHitForRevision>(hits: T[]): T | undefined => {
  const [newest] = hits;
  if (!newest) {
    return undefined;
  }
  const newestTimestamp = newest.sort?.[0];
  return hits
    .filter((hit) => hit.sort?.[0] === newestTimestamp)
    .reduce((current, hit) => ((hit._id ?? '') > (current._id ?? '') ? hit : current));
};

export interface KiSearchOptions {
  esClient: ElasticsearchClient;
  dest: AiIndexDest;
  kiId: string;
  /** Pins the search to one physical backing index (ignored for data streams). */
  backingIndex?: string;
  /** Fetches the full `_source` for an index-type dest instead of just `id`/`governance`. */
  includeSource?: boolean;
  abortSignal?: AbortSignal;
}

/**
 * Searches for every hit matching a KI id, scoped to a dest and (optionally) pinned to one
 * backing index, sized and sorted to resolve the current revision when more than one physical
 * document could match. Shared by `getKi` and `findKiRevision`.
 */
export const findKiHits = async <T>({
  esClient,
  dest,
  kiId,
  backingIndex,
  includeSource,
  abortSignal,
}: KiSearchOptions): Promise<{
  hits: estypes.SearchHit<T>[];
  resolveNewestRevision: boolean;
}> => {
  const isDataStream = dest.type === 'data_stream';
  const useBackingIndexFilter = !isDataStream && backingIndex !== undefined;
  const resolveNewestRevision = isDataStream || useBackingIndexFilter;
  const response = await esClient.search<T>(
    {
      index: dest.value,
      ...LENIENT_INDEX_OPTIONS,
      query: useBackingIndexFilter
        ? { bool: { filter: [kiIdQuery(kiId), { term: { _index: backingIndex } }] } }
        : kiIdQuery(kiId),
      ...(resolveNewestRevision && {
        sort: [{ '@timestamp': { order: 'desc' as const, unmapped_type: 'date' as const } }],
      }),
      size: resolveNewestRevision ? REVISION_TIE_WINDOW : 2,
      seq_no_primary_term: true,
      _source: isDataStream || includeSource ? true : ['id', 'governance'],
    },
    { signal: abortSignal }
  );
  return { hits: response.hits.hits, resolveNewestRevision };
};

export interface GetKiOptions {
  aiIndexId: string;
  dest: AiIndexDest;
  index: string;
  kiId: string;
  /** When omitted, deleted KIs are excluded (unset status counts as active). */
  lifecycleStatuses?: KiLifecycleStatus[];
}

/** Fetches the current revision of a KI. */
export const getKi = async (
  esClient: ElasticsearchClient,
  { aiIndexId, dest, index, kiId, lifecycleStatuses }: GetKiOptions
): Promise<GetKiResponse> => {
  const { hits, resolveNewestRevision } = await findKiHits<KiDocument>({
    esClient,
    dest,
    kiId,
    backingIndex: index,
    includeSource: true,
  });

  const hit = resolveNewestRevision ? pickCurrentRevision(hits) : hits[0];
  const { _id, _source: document } = hit ?? {};
  if (
    _id === undefined ||
    document === undefined ||
    !matchesLifecycleFilter(document, lifecycleStatuses)
  ) {
    throw new KiNotFoundError(aiIndexId, kiId);
  }

  return { id: typeof document.id === 'string' ? document.id : _id, document };
};
