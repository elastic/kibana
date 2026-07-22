/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { ISavedObjectsRepository, Logger, SavedObject } from '@kbn/core/server';
import { CASE_CONFIGURE_SAVED_OBJECT, CASE_SAVED_OBJECT } from '../../../common/constants';
import type { ConfigurationPersistedAttributes } from '../../common/types/configure';
import type { CasePersistedAttributes } from '../../common/types/case';
import { buildExtendedFieldsBackfill } from './build_case_extended_fields';
import {
  CASE_BACKFILL_PAGE_SIZE,
  CASE_BACKFILL_PIT_KEEP_ALIVE,
  CASE_BACKFILL_SCAN_BUDGET,
} from './types';
import type { CaseBackfillCursor, CaseBackfillPhaseResult, SpaceBackfillResult } from './types';

/** Best-effort PIT close — an already-expired PIT lapses on its own, so a failure here is harmless. */
const safeClosePit = async (
  repo: ISavedObjectsRepository,
  pitId: string,
  log: Logger
): Promise<void> => {
  try {
    await repo.closePointInTime(pitId);
  } catch (err) {
    log.debug(
      `Failed to close case-backfill PIT: ${err instanceof Error ? err.message : String(err)}`
    );
  }
};

/** Records `legacyCasesMigrated: true` on the space's configure SO once its backfill is complete. */
const setCasesMigratedFlag = async (
  repo: ISavedObjectsRepository,
  so: SavedObject<ConfigurationPersistedAttributes>
): Promise<void> => {
  if (so.attributes.legacyCasesMigrated) {
    return;
  }
  const namespace = so.namespaces?.[0] ?? 'default';
  const nsOption = namespace === 'default' ? undefined : namespace;
  await repo.update<ConfigurationPersistedAttributes>(
    CASE_CONFIGURE_SAVED_OBJECT,
    so.id,
    { legacyCasesMigrated: true },
    { ...(nsOption ? { namespace: nsOption } : {}), refresh: false }
  );
};

/**
 * Backfills one space's cases using an Elasticsearch Point-In-Time cursor (skip-safe, and not
 * subject to the from/size result-window limit that breaks past ~10k docs). Fills only the
 * `extended_fields` keys a case is missing (never overwriting existing values) and stops when the
 * space is exhausted, the per-run scan budget is hit, or the task is cancelled — returning where to
 * resume in each of those cases.
 */
const backfillCasesForSpace = async (
  repo: ISavedObjectsRepository,
  so: SavedObject<ConfigurationPersistedAttributes>,
  resumeCursor: CaseBackfillCursor | undefined,
  scanBudget: number,
  signal: AbortSignal,
  executionId: string,
  log: Logger
): Promise<SpaceBackfillResult> => {
  const { owner } = so.attributes;
  const namespace = so.namespaces?.[0] ?? 'default';
  const nsOption = namespace === 'default' ? undefined : namespace;
  const namespaces = nsOption ? [nsOption] : ['default'];
  const filter = `${CASE_SAVED_OBJECT}.attributes.owner: "${owner}"`;

  const openPit = async () =>
    (
      await repo.openPointInTimeForType(CASE_SAVED_OBJECT, {
        namespaces,
        keepAlive: CASE_BACKFILL_PIT_KEEP_ALIVE,
      })
    ).id;

  // The cursor is advanced across awaits inside a strictly sequential scan loop (one page at a time,
  // no concurrent access), so require-atomic-updates is a false positive here.
  /* eslint-disable require-atomic-updates */
  const cursor: { pitId: string; searchAfter?: SortResults; reopenedStalePit: boolean } = {
    pitId: resumeCursor?.pitId ?? (await openPit()),
    searchAfter: resumeCursor?.pitId ? resumeCursor.searchAfter : undefined,
    reopenedStalePit: false,
  };
  let scanned = 0;
  let backfilled = 0;
  let hadFailures = false;

  const makeCursor = (): CaseBackfillCursor => ({
    configureId: so.id,
    owner,
    namespace,
    nsOption,
    pitId: cursor.pitId,
    searchAfter: cursor.searchAfter,
  });

  // Fetches one page, transparently reopening the PIT once if a resumed one has expired. Restarting
  // the scan is safe because the backfill only fills missing keys (already-done cases are skipped).
  //
  // No `sortField` is passed on purpose. The SO repository only appends the unique `_shard_doc`
  // tiebreaker for a PIT search when no sort field is given (see getSortingParams). Sorting by a
  // non-unique field such as `created_at` would leave `search_after` without a tiebreaker, so any
  // cases sharing the last page's `created_at` (common for bulk-imported cases) would be skipped —
  // permanently, once the space is flagged. `_shard_doc` is unique per doc, stable within the PIT,
  // and the recommended (fastest) ordering for a full PIT scan.
  const fetchPage = async () => {
    const findPage = () =>
      repo.find<CasePersistedAttributes>({
        type: CASE_SAVED_OBJECT,
        perPage: CASE_BACKFILL_PAGE_SIZE,
        pit: { id: cursor.pitId, keepAlive: CASE_BACKFILL_PIT_KEEP_ALIVE },
        ...(cursor.searchAfter ? { searchAfter: cursor.searchAfter } : {}),
        filter,
      });

    try {
      return await findPage();
    } catch (err) {
      if (cursor.reopenedStalePit) {
        await safeClosePit(repo, cursor.pitId, log);
        throw err;
      }
      cursor.reopenedStalePit = true;
      log.warn(
        `[${executionId}] Case-backfill PIT invalid for owner "${owner}" (namespace: ${namespace}); reopening and rescanning the space`
      );
      cursor.pitId = await openPit();
      cursor.searchAfter = undefined;
      return findPage();
    }
  };

  while (true) {
    if (signal.aborted) {
      return { outcome: 'paused', scanned, backfilled, cursor: makeCursor() };
    }

    const page = await fetchPage();
    cursor.pitId = page.pit_id ?? cursor.pitId;
    const cases = page.saved_objects;
    scanned += cases.length;

    const updates = cases.flatMap((caseSO) => {
      const additions = buildExtendedFieldsBackfill(
        caseSO.attributes.customFields,
        caseSO.attributes.extended_fields
      );
      if (Object.keys(additions).length === 0) {
        return [];
      }
      return [
        {
          type: CASE_SAVED_OBJECT,
          id: caseSO.id,
          attributes: {
            extended_fields: { ...(caseSO.attributes.extended_fields ?? {}), ...additions },
          },
          ...(nsOption ? { namespace: nsOption } : {}),
        },
      ];
    });

    if (updates.length > 0) {
      const res = await repo.bulkUpdate<CasePersistedAttributes>(updates, { refresh: false });
      const failed = res.saved_objects.filter((s) => s.error != null);
      if (failed.length > 0) {
        // A 404 means the case can't be resolved for update — it was deleted between the scan and the
        // update, or its stored id/namespace don't line up (e.g. synthetic data inserted straight
        // into ES). Retrying never succeeds, so skip these rather than blocking the space forever.
        const notRetryable = failed.filter((s) => s.error?.statusCode === 404);
        const retryable = failed.filter((s) => s.error?.statusCode !== 404);
        const distinctReasons = (list: typeof failed) =>
          [...new Set(list.map((s) => s.error?.message ?? JSON.stringify(s.error)))].join('; ');

        if (notRetryable.length > 0) {
          log.warn(
            `[${executionId}] ${notRetryable.length}/${
              updates.length
            } case extended_fields updates skipped (not found — won't retry) for owner "${owner}" (namespace: ${namespace}): ${distinctReasons(
              notRetryable
            )}`
          );
        }
        if (retryable.length > 0) {
          hadFailures = true;
          log.error(
            `[${executionId}] ${retryable.length}/${
              updates.length
            } case extended_fields updates failed for owner "${owner}" (namespace: ${namespace}); the space will be retried on a later run. Errors: ${distinctReasons(
              retryable
            )}`
          );
        }
      }
      backfilled += updates.length - failed.length;
    }

    const lastSort = cases[cases.length - 1]?.sort;
    if (lastSort) {
      cursor.searchAfter = lastSort;
    }

    // Exhausted this space's cases.
    if (cases.length < CASE_BACKFILL_PAGE_SIZE) {
      await safeClosePit(repo, cursor.pitId, log);
      // Complete only when nothing failed; otherwise report `failed` so the space is retried fresh.
      return {
        outcome: hadFailures ? 'failed' : 'complete',
        scanned,
        backfilled,
        cursor: undefined,
      };
    }

    // Per-run scan budget hit. If a page failed, report `failed` (retry the space fresh — its cases
    // are idempotent); otherwise `paused` with the PIT cursor so the next run resumes where we left off.
    if (scanned >= scanBudget) {
      if (hadFailures) {
        await safeClosePit(repo, cursor.pitId, log);
        return { outcome: 'failed', scanned, backfilled, cursor: undefined };
      }
      return { outcome: 'paused', scanned, backfilled, cursor: makeCursor() };
    }
  }
  /* eslint-enable require-atomic-updates */
};

/**
 * Resumable existing-case backfill phase. Walks the spaces still needing a backfill (custom fields
 * configured AND `legacyCasesMigrated` not yet set), resuming the cursor's space first, and scans at
 * most `CASE_BACKFILL_SCAN_BUDGET` cases across this run. Flags a space migrated only once it is
 * fully backfilled. Returns whether every pending space finished and, if not, where to resume next.
 */
export const runCaseBackfillPhase = async (
  repo: ISavedObjectsRepository,
  configures: Array<SavedObject<ConfigurationPersistedAttributes>>,
  resumeCursor: CaseBackfillCursor | undefined,
  signal: AbortSignal,
  executionId: string,
  log: Logger
): Promise<CaseBackfillPhaseResult> => {
  const pending = configures.filter(
    (so) => (so.attributes.customFields?.length ?? 0) > 0 && !so.attributes.legacyCasesMigrated
  );

  if (pending.length === 0) {
    return { complete: true, backfilled: 0, hadFailures: false };
  }

  // Resume the cursor's space first if it is still pending; otherwise it was already completed and
  // the cursor is stale, so drop it and start from the first pending space.
  let ordered = pending;
  let cursor = resumeCursor;
  if (cursor) {
    const resumeConfigureId = cursor.configureId;
    const idx = pending.findIndex((so) => so.id === resumeConfigureId);
    if (idx > 0) {
      ordered = [pending[idx], ...pending.slice(0, idx), ...pending.slice(idx + 1)];
    } else if (idx < 0) {
      cursor = undefined;
    }
  }

  let scannedThisRun = 0;
  let backfilled = 0;
  let hadFailures = false;

  for (const so of ordered) {
    if (signal.aborted) {
      return { complete: false, backfilled, hadFailures, nextCursor: undefined };
    }

    const budgetLeft = CASE_BACKFILL_SCAN_BUDGET - scannedThisRun;
    if (budgetLeft <= 0) {
      // Budget spent between spaces — reschedule to continue with the remaining spaces on a fresh run.
      return { complete: false, backfilled, hadFailures, nextCursor: undefined };
    }

    const cursorForSpace = cursor?.configureId === so.id ? cursor : undefined;
    cursor = undefined; // the resume cursor only applies to its own space

    const result = await backfillCasesForSpace(
      repo,
      so,
      cursorForSpace,
      budgetLeft,
      signal,
      executionId,
      log
    );
    scannedThisRun += result.scanned;
    backfilled += result.backfilled;

    if (result.outcome === 'paused') {
      // Budget hit or cancelled on this space — stop and resume it (via its cursor) next run.
      return { complete: false, backfilled, hadFailures, nextCursor: result.cursor };
    }

    if (result.outcome === 'complete') {
      await setCasesMigratedFlag(repo, so);
    } else {
      // 'failed' — leave the space unflagged and keep going, so one bad space doesn't starve the
      // rest. It is retried on a later run; the run reports hadFailures so the runner can give up.
      hadFailures = true;
    }
  }

  // Reached the end of the pending list. Complete only if every space finished without failures.
  return { complete: !hadFailures, backfilled, hadFailures, nextCursor: undefined };
};
