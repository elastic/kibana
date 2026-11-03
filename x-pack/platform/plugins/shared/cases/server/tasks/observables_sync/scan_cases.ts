/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ISavedObjectsRepository, Logger, SavedObject } from '@kbn/core/server';
import { CASE_SAVED_OBJECT } from '../../../common/constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import {
  OBSERVABLES_SYNC_CONCURRENCY,
  OBSERVABLES_SYNC_PAGE_SIZE,
  OBSERVABLES_SYNC_PIT_KEEP_ALIVE,
} from './types';
import type { CaseScanCursor } from './types';

const NAMESPACES_ALL = ['*'];

export interface ScanCasesResult {
  /** `complete` when the scan reached the end, `paused` when it stopped at a budget or an abort. */
  outcome: 'complete' | 'paused';
  scanned: number;
  /** Where the next run resumes. Only set when the scan is paused. */
  cursor?: CaseScanCursor;
}

/** Best-effort PIT close: an expired PIT lapses on its own, so a failure here is harmless. */
const safeClosePit = async (
  repo: ISavedObjectsRepository,
  pitId: string,
  logger: Logger
): Promise<void> => {
  try {
    await repo.closePointInTime(pitId);
  } catch (error) {
    logger.debug(
      `Failed to close the observables sync PIT: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * Walks the cases of every space that match `filter`, a page at a time over a Point-In-Time, and
 * hands each page to `handleCase`. It stops when the cases are exhausted, `caseBudget` cases were
 * scanned, or `shouldPause` turns true, and returns where to resume.
 *
 * No `sortField` is passed on purpose: with a PIT the saved objects repository sorts by `_shard_doc`,
 * which is unique per document, so `search_after` never skips cases that share a timestamp. A resumed
 * PIT that expired is reopened once and the scan restarts, which is safe because every handler is
 * idempotent.
 */
export const scanCases = async ({
  repo,
  logger,
  filter,
  cursor: resumeCursor,
  caseBudget,
  shouldPause,
  handleCase,
}: {
  repo: ISavedObjectsRepository;
  logger: Logger;
  filter: string;
  cursor?: CaseScanCursor;
  caseBudget: number;
  shouldPause: () => boolean;
  handleCase: (caseSO: SavedObject<CasePersistedAttributes>) => Promise<void>;
}): Promise<ScanCasesResult> => {
  const openPit = async () =>
    (
      await repo.openPointInTimeForType(CASE_SAVED_OBJECT, {
        namespaces: NAMESPACES_ALL,
        keepAlive: OBSERVABLES_SYNC_PIT_KEEP_ALIVE,
      })
    ).id;

  // The cursor advances across awaits inside a strictly sequential loop (one page at a time), so
  // require-atomic-updates is a false positive here.
  /* eslint-disable require-atomic-updates */
  const cursor: CaseScanCursor & { reopenedStalePit: boolean } = {
    pitId: resumeCursor?.pitId ?? (await openPit()),
    searchAfter: resumeCursor?.searchAfter,
    reopenedStalePit: false,
  };
  let scanned = 0;

  const fetchPage = async () => {
    const findPage = () =>
      repo.find<CasePersistedAttributes>({
        type: CASE_SAVED_OBJECT,
        // Required next to the PIT: an unscoped internal repository would otherwise search only the
        // `default` space.
        namespaces: NAMESPACES_ALL,
        perPage: OBSERVABLES_SYNC_PAGE_SIZE,
        pit: { id: cursor.pitId, keepAlive: OBSERVABLES_SYNC_PIT_KEEP_ALIVE },
        ...(cursor.searchAfter ? { searchAfter: cursor.searchAfter } : {}),
        filter,
      });

    try {
      return await findPage();
    } catch (error) {
      if (cursor.reopenedStalePit) {
        await safeClosePit(repo, cursor.pitId, logger);
        throw error;
      }
      cursor.reopenedStalePit = true;
      logger.warn('The observables sync PIT is no longer valid; reopening it and rescanning');
      cursor.pitId = await openPit();
      cursor.searchAfter = undefined;
      try {
        return await findPage();
      } catch (retryError) {
        await safeClosePit(repo, cursor.pitId, logger);
        throw retryError;
      }
    }
  };

  while (true) {
    if (shouldPause() || scanned >= caseBudget) {
      return {
        outcome: 'paused',
        scanned,
        cursor: { pitId: cursor.pitId, searchAfter: cursor.searchAfter },
      };
    }

    const page = await fetchPage();
    cursor.pitId = page.pit_id ?? cursor.pitId;
    const cases = page.saved_objects;
    scanned += cases.length;

    await pMap(cases, handleCase, { concurrency: OBSERVABLES_SYNC_CONCURRENCY });

    const lastSort = cases[cases.length - 1]?.sort;
    if (lastSort) {
      cursor.searchAfter = lastSort;
    }

    if (cases.length < OBSERVABLES_SYNC_PAGE_SIZE) {
      await safeClosePit(repo, cursor.pitId, logger);
      return { outcome: 'complete', scanned };
    }
  }
  /* eslint-enable require-atomic-updates */
};
