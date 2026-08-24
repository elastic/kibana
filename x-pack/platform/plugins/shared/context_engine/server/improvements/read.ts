/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type {
  ImprovementEnvelope,
  ImprovementStatus,
  ListImprovementsResponse,
} from '../../common/http_api/improvements';
import { buildImprovementsIndexName } from '../../common/http_api/improvements';

/**
 * Query builders for the improvements store, kept as free functions so they can be exercised
 * without a service instance. Callers reach them through `ImprovementsService`, which supplies the
 * internal-user client the store's index requires.
 */

/** Options shared by every read so a missing index yields an empty result rather than an error. */
const LENIENT_INDEX_OPTIONS = {
  ignore_unavailable: true,
  allow_no_indices: true,
} as const;

const buildQuery = ({
  aiIndexId,
  statuses,
}: {
  aiIndexId: string;
  statuses?: readonly ImprovementStatus[];
}): QueryDslQueryContainer => ({
  bool: {
    filter: [
      { term: { ai_index_id: aiIndexId } },
      ...(statuses?.length ? [{ terms: { status: [...statuses] } }] : []),
    ],
  },
});

const toImprovements = (hits: Array<{ _source?: ImprovementEnvelope }>): ImprovementEnvelope[] =>
  hits.map((hit) => hit._source).filter((source): source is ImprovementEnvelope => source != null);

/**
 * Lists an AI index's improvements, newest suggestion first and paginated. `statuses` narrows the
 * result — the review UI passes the open statuses so rejected suggestions stay hidden.
 */
export const getImprovements = async (
  esClient: ElasticsearchClient,
  {
    spaceId,
    aiIndexId,
    statuses,
    from,
    size,
  }: {
    spaceId: string;
    aiIndexId: string;
    statuses?: readonly ImprovementStatus[];
    from: number;
    size: number;
  }
): Promise<ListImprovementsResponse> => {
  const response = await esClient.search<ImprovementEnvelope>({
    index: buildImprovementsIndexName(spaceId),
    ...LENIENT_INDEX_OPTIONS,
    from,
    size,
    track_total_hits: true,
    query: buildQuery({ aiIndexId, statuses }),
    sort: [{ suggested_at: { order: 'desc' } }],
  });

  const improvements = toImprovements(response.hits.hits);
  const total =
    typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value ?? improvements.length;

  return { improvements, total };
};

/**
 * Fetches every improvement ever suggested for an AI index, including rejected ones. This is what
 * the agent receives as prior history so it does not re-propose a refused or already-applied change.
 */
export const getImprovementHistory = async (
  esClient: ElasticsearchClient,
  { spaceId, aiIndexId, size }: { spaceId: string; aiIndexId: string; size: number }
): Promise<ImprovementEnvelope[]> => {
  const response = await esClient.search<ImprovementEnvelope>({
    index: buildImprovementsIndexName(spaceId),
    ...LENIENT_INDEX_OPTIONS,
    size,
    track_total_hits: false,
    query: buildQuery({ aiIndexId }),
    sort: [{ suggested_at: { order: 'desc' } }],
  });

  return toImprovements(response.hits.hits);
};

/**
 * Fetches the improvements matching any of `improvementIds`. Used to tell an unseen suggestion from
 * one that has already been proposed or resolved, before a run's output is written.
 */
export const getImprovementsByIds = async (
  esClient: ElasticsearchClient,
  { spaceId, improvementIds }: { spaceId: string; improvementIds: string[] }
): Promise<ImprovementEnvelope[]> => {
  if (improvementIds.length === 0) {
    return [];
  }

  const response = await esClient.search<ImprovementEnvelope>({
    index: buildImprovementsIndexName(spaceId),
    ...LENIENT_INDEX_OPTIONS,
    size: improvementIds.length,
    track_total_hits: false,
    query: { bool: { filter: [{ terms: { improvement_id: improvementIds } }] } },
  });

  return toImprovements(response.hits.hits);
};

/** Fetches a single improvement by id, or `undefined` when it does not exist in this space. */
export const getImprovementById = async (
  esClient: ElasticsearchClient,
  { spaceId, improvementId }: { spaceId: string; improvementId: string }
): Promise<ImprovementEnvelope | undefined> => {
  const response = await esClient.search<ImprovementEnvelope>({
    index: buildImprovementsIndexName(spaceId),
    ...LENIENT_INDEX_OPTIONS,
    size: 1,
    track_total_hits: false,
    query: { bool: { filter: [{ term: { improvement_id: improvementId } }] } },
  });

  return toImprovements(response.hits.hits)[0];
};
