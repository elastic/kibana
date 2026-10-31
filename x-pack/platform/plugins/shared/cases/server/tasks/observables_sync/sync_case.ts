/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository, SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import type { ObservablesService } from '../../services/observables';
import { MAX_CASE_SYNC_ATTEMPTS } from './types';

interface SyncedCounts {
  created: number;
  updated: number;
  deleted: number;
}

export type SyncCaseOutcome =
  | ({ status: 'synced' } & SyncedCounts)
  | ({ status: 'case_deleted' } & Pick<SyncedCounts, 'deleted'>)
  | ({ status: 'pending' } & SyncedCounts);

const isConflict = (error: unknown): boolean =>
  SavedObjectsErrorHelpers.isConflictError(error as Error);

const isNotFound = (error: unknown): boolean =>
  SavedObjectsErrorHelpers.isNotFoundError(error as Error);

/**
 * Makes the observables index match the observables field of one case, then clears the case's
 * `observables_sync_pending` flag with an update that carries the case version read at the start.
 *
 * The versioned update is what makes the sync safe next to a live writer. A writer that reads the
 * case, writes the index and then updates the case with the version it read either lands its case
 * update first, so this update conflicts and the case is synced again, or lands it second, so its
 * update conflicts and the writer redoes its index write. Either way nothing the sync deleted from
 * the index stays missing.
 *
 * After `MAX_CASE_SYNC_ATTEMPTS` version conflicts the case is flagged pending with an unversioned
 * update. That is safe because writers only ever set the flag to true.
 */
export const syncCaseObservables = async ({
  repo,
  observablesService,
  caseSO,
  signal,
}: {
  repo: ISavedObjectsRepository;
  observablesService: Pick<ObservablesService, 'syncCase' | 'deleteCaseDocuments'>;
  caseSO: SavedObject<CasePersistedAttributes>;
  signal?: AbortSignal;
}): Promise<SyncCaseOutcome> => {
  const { id } = caseSO;
  const spaceId = caseSO.namespaces?.[0] ?? 'default';
  const namespace = spaceId === 'default' ? undefined : spaceId;
  const totals: SyncedCounts = { created: 0, updated: 0, deleted: 0 };

  const handleCaseDeleted = async (): Promise<SyncCaseOutcome> => {
    const deleted = await observablesService.deleteCaseDocuments({ caseId: id, spaceId, signal });
    return { status: 'case_deleted', deleted: totals.deleted + deleted };
  };

  let current = caseSO;
  for (let attempt = 1; attempt <= MAX_CASE_SYNC_ATTEMPTS; attempt++) {
    const result = await observablesService.syncCase({
      caseId: id,
      spaceId,
      owner: current.attributes.owner,
      observables: current.attributes.observables ?? [],
      source: 'migration',
      signal,
    });
    totals.created += result.created;
    totals.updated += result.updated;
    totals.deleted += result.deleted;

    try {
      await repo.update<CasePersistedAttributes>(
        CASE_SAVED_OBJECT,
        id,
        { observables_sync_pending: false },
        { ...(namespace ? { namespace } : {}), version: current.version, refresh: false }
      );
      return { status: 'synced', ...totals };
    } catch (error) {
      if (isNotFound(error)) {
        return handleCaseDeleted();
      }
      if (!isConflict(error)) {
        throw error;
      }
    }

    try {
      current = await repo.get<CasePersistedAttributes>(CASE_SAVED_OBJECT, id, {
        ...(namespace ? { namespace } : {}),
      });
    } catch (error) {
      if (isNotFound(error)) {
        return handleCaseDeleted();
      }
      throw error;
    }
  }

  try {
    await repo.update<CasePersistedAttributes>(
      CASE_SAVED_OBJECT,
      id,
      { observables_sync_pending: true },
      { ...(namespace ? { namespace } : {}), refresh: false }
    );
  } catch (error) {
    if (isNotFound(error)) {
      return handleCaseDeleted();
    }
    throw error;
  }
  return { status: 'pending', ...totals };
};

/** Flags a case as pending sync without a version check. Returns whether the flag was written. */
export const flagCasePending = async ({
  repo,
  caseSO,
}: {
  repo: ISavedObjectsRepository;
  caseSO: SavedObject<CasePersistedAttributes>;
}): Promise<boolean> => {
  const spaceId = caseSO.namespaces?.[0] ?? 'default';
  try {
    await repo.update<CasePersistedAttributes>(
      CASE_SAVED_OBJECT,
      caseSO.id,
      { observables_sync_pending: true },
      { ...(spaceId === 'default' ? {} : { namespace: spaceId }), refresh: false }
    );
    return true;
  } catch (error) {
    return false;
  }
};
