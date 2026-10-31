/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ISavedObjectsRepository, Logger } from '@kbn/core/server';
import { isSavedObjectErrorResult } from '@kbn/core/server';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import type { ObservablesCaseKey, ObservablesService } from '../../services/observables';
import { syncCaseObservables } from './sync_case';
import type { SyncCaseOutcome } from './sync_case';
import { OBSERVABLES_SYNC_CONCURRENCY, OBSERVABLES_SYNC_PAGE_SIZE } from './types';

export interface CleanupPhaseResult {
  outcome: 'complete' | 'paused';
  scanned: number;
  /** Where the next run resumes. Only set when the phase is paused. */
  after?: ObservablesCaseKey;
}

/**
 * Walks the cases that have documents in the observables index and removes what no longer belongs
 * there: all documents of a case that was deleted (which also covers deleted spaces, since deleting
 * a space removes its cases without a cascade), and all documents of a case whose observables field
 * is empty. A case that still has observables is left to the copy phase.
 *
 * `onOutcome` receives the result of every case that was changed, and `onFailure` every case that
 * could not be processed.
 */
export const runCleanupPhase = async ({
  repo,
  observablesService,
  logger,
  signal,
  after: resumeAfter,
  caseBudget,
  shouldPause,
  onOutcome,
  onOrphan,
  onFailure,
}: {
  repo: ISavedObjectsRepository;
  observablesService: Pick<ObservablesService, 'listCaseKeys' | 'syncCase' | 'deleteCaseDocuments'>;
  logger: Logger;
  signal: AbortSignal;
  after?: ObservablesCaseKey;
  caseBudget: number;
  shouldPause: () => boolean;
  onOutcome: (outcome: SyncCaseOutcome) => void;
  onOrphan: (deletedDocuments: number) => void;
  onFailure: (key: ObservablesCaseKey, error: unknown) => void;
}): Promise<CleanupPhaseResult> => {
  let after = resumeAfter;
  let scanned = 0;

  while (true) {
    if (shouldPause() || scanned >= caseBudget) {
      return { outcome: 'paused', scanned, after };
    }

    const page = await observablesService.listCaseKeys({
      size: OBSERVABLES_SYNC_PAGE_SIZE,
      after,
      signal,
    });
    if (page.cases.length === 0) {
      return { outcome: 'complete', scanned };
    }

    const { saved_objects: found } = await repo.bulkGet<CasePersistedAttributes>(
      page.cases.map(({ caseId, spaceId }) => ({
        type: CASE_SAVED_OBJECT,
        id: caseId,
        namespaces: [spaceId],
      }))
    );

    await pMap(
      page.cases,
      async (key, index) => {
        const caseSO = found[index];
        try {
          if (!caseSO || (isSavedObjectErrorResult(caseSO) && caseSO.error.statusCode === 404)) {
            onOrphan(
              await observablesService.deleteCaseDocuments({
                caseId: key.caseId,
                spaceId: key.spaceId,
                signal,
              })
            );
            return;
          }
          if (isSavedObjectErrorResult(caseSO)) {
            throw new Error(caseSO.error.message);
          }
          if ((caseSO.attributes.observables?.length ?? 0) > 0) {
            return;
          }
          onOutcome(await syncCaseObservables({ repo, observablesService, caseSO, signal }));
        } catch (error) {
          logger.warn(
            `Failed to clean up the observables index for case ${key.caseId} in space ${
              key.spaceId
            }: ${error instanceof Error ? error.message : String(error)}`
          );
          onFailure(key, error);
        }
      },
      { concurrency: OBSERVABLES_SYNC_CONCURRENCY }
    );

    scanned += page.cases.length;
    after = page.after;

    if (page.cases.length < OBSERVABLES_SYNC_PAGE_SIZE) {
      return { outcome: 'complete', scanned };
    }
  }
};
