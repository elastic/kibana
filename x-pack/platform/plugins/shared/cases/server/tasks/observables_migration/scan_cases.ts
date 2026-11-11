/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type {
  ISavedObjectsRepository,
  ISavedObjectsSerializer,
  Logger,
  SavedObjectsRawDoc,
} from '@kbn/core/server';
import { ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { Observable } from '../../../common/types/domain';
import { OBSERVABLES_MIGRATION_PIT_KEEP_ALIVE } from './constants';
import type { ObservablesMigrationCursor } from './types';

/** A case that still holds observables in its `observables` field. */
export interface LegacyCase {
  id: string;
  owner: string;
  namespaces: string[];
  observables: Array<Partial<Observable>>;
}

export interface LegacyCasesPage {
  cases: LegacyCase[];
  /** Where the next page starts. Persist it only after this page has been migrated. */
  nextCursor: ObservablesMigrationCursor;
  done: boolean;
}

interface LegacyCaseAttributes {
  owner?: string;
  observables?: Array<Partial<Observable>> | null;
}

interface LegacyCaseSource {
  type: string;
  namespaces?: string[];
  [CASE_SAVED_OBJECT]?: LegacyCaseAttributes;
}

/** The point in time of a resumed scan has expired; reopen it and resume from `lastCreatedAt`. */
export class StalePointInTimeError extends Error {}

const ALL_NAMESPACES = [ALL_NAMESPACES_STRING];
const OBSERVABLES_PATH = `${CASE_SAVED_OBJECT}.observables`;
const CREATED_AT_FIELD = `${CASE_SAVED_OBJECT}.created_at`;

const hasLegacyObservables: estypes.QueryDslQueryContainer = {
  nested: {
    path: OBSERVABLES_PATH,
    query: { exists: { field: `${OBSERVABLES_PATH}.typeKey` } },
  },
};

/** Counts the cases that hold observables in their field, and those observables. */
export const countLegacyObservables = async (
  repo: ISavedObjectsRepository
): Promise<{ cases: number; observables: number }> => {
  const response = await repo.search<LegacyCaseSource, { observables: { doc_count: number } }>({
    type: CASE_SAVED_OBJECT,
    namespaces: ALL_NAMESPACES,
    size: 0,
    track_total_hits: true,
    query: hasLegacyObservables,
    aggs: { observables: { nested: { path: OBSERVABLES_PATH } } },
  });

  const { total } = response.hits;
  return {
    cases: typeof total === 'number' ? total : total?.value ?? 0,
    observables: response.aggregations?.observables.doc_count ?? 0,
  };
};

export const openLegacyCasesPointInTime = async (
  repo: ISavedObjectsRepository
): Promise<string> => {
  const { id } = await repo.openPointInTimeForType(CASE_SAVED_OBJECT, {
    namespaces: ALL_NAMESPACES,
    keepAlive: OBSERVABLES_MIGRATION_PIT_KEEP_ALIVE,
  });
  return id;
};

/** Best effort: an expired point in time lapses on its own. */
export const closeLegacyCasesPointInTime = async (
  repo: ISavedObjectsRepository,
  pitId: string,
  logger: Logger
): Promise<void> => {
  try {
    await repo.closePointInTime(pitId);
  } catch (error) {
    logger.debug(`Failed to close the observables migration point in time: ${error}`);
  }
};

const toLegacyCase = (
  hit: estypes.SearchHit<LegacyCaseSource>,
  serializer: ISavedObjectsSerializer
): LegacyCase => {
  const { id, attributes, namespaces } = serializer.rawToSavedObject<LegacyCaseAttributes>(
    hit as SavedObjectsRawDoc
  );
  return {
    id,
    owner: attributes.owner ?? '',
    namespaces: namespaces ?? [],
    observables: attributes.observables ?? [],
  };
};

/**
 * Reads the next page of cases that hold observables, oldest first. The sort ends with
 * `_shard_doc`, which is unique within the point in time. When the point in time is replaced,
 * the scan restarts at the last migrated `created_at`, so cases sharing it are read again.
 */
export const fetchLegacyCasesPage = async ({
  repo,
  serializer,
  cursor,
  pageSize,
}: {
  repo: ISavedObjectsRepository;
  serializer: ISavedObjectsSerializer;
  cursor: ObservablesMigrationCursor;
  pageSize: number;
}): Promise<LegacyCasesPage> => {
  const { pitId, searchAfter, lastCreatedAt } = cursor;
  const filter: estypes.QueryDslQueryContainer[] = [hasLegacyObservables];
  if (lastCreatedAt != null) {
    filter.push({ range: { [CREATED_AT_FIELD]: { gte: lastCreatedAt, format: 'epoch_millis' } } });
  }

  const response = await repo.search<LegacyCaseSource>({
    type: CASE_SAVED_OBJECT,
    namespaces: ALL_NAMESPACES,
    pit: { id: pitId, keep_alive: OBSERVABLES_MIGRATION_PIT_KEEP_ALIVE },
    size: pageSize,
    track_total_hits: false,
    _source: ['type', 'namespaces', `${CASE_SAVED_OBJECT}.owner`, OBSERVABLES_PATH],
    sort: [{ [CREATED_AT_FIELD]: { order: 'asc' } }, { _shard_doc: { order: 'asc' } }],
    ...(searchAfter != null && { search_after: searchAfter }),
    query: { bool: { filter } },
  });

  // The saved objects search answers a missing point in time (404) with an empty response, which
  // would otherwise read as the end of the scan.
  if (response.pit_id == null) {
    throw new StalePointInTimeError(`Point in time ${pitId} is no longer available`);
  }

  const { hits } = response.hits;
  const lastSort = hits[hits.length - 1]?.sort;
  const [lastSortCreatedAt] = lastSort ?? [];

  return {
    cases: hits.map((hit) => toLegacyCase(hit, serializer)),
    nextCursor: {
      pitId: response.pit_id,
      searchAfter: lastSort != null ? (lastSort as Array<number | string>) : searchAfter,
      lastCreatedAt:
        typeof lastSortCreatedAt === 'number' && Number.isSafeInteger(lastSortCreatedAt)
          ? lastSortCreatedAt
          : lastCreatedAt,
    },
    done: hits.length < pageSize,
  };
};
