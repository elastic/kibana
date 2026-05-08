/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ISavedObjectsRepository,
  Logger,
  SavedObject,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import {
  CASE_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
  CASES_ANALYTICS_STATE_SO_ID,
  CASES_ANALYTICS_STATE_SO_TYPE,
} from '../../../common/constants';
import type { CasePersistedAttributes } from '../../common/types/case';
import type { UserActionPersistedAttributes } from '../../common/types/user_actions';
import type { CasesAnalyticsWriterContract } from '../writer';
import type { CasesAnalyticsStateAttributes } from './state_so';

/**
 * Minimal SO-finder shape the runner needs. Narrower than
 * `SavedObjectsClientContract` so the unavoidable `as unknown as` cast in
 * `reconciliation/index.ts` (where we hand an `ISavedObjectsRepository` here)
 * is checked against just the surface we actually use, not the whole SO API.
 * If a future change calls a method outside this interface, TypeScript catches
 * the mistake instead of failing at runtime in production.
 */
export interface ReconciliationSavedObjectsFinder {
  find: <T>(options: SavedObjectsFindOptions) => Promise<SavedObjectsFindResponse<T, unknown>>;
}

/**
 * Optional sub-system the runner can drive on each tick. Today only the data
 * view sync uses this — its `reconcile()` walks templates and refreshes
 * extended-field runtime mappings. Defined here as a minimal shape so the
 * runner doesn't depend on the data view module's public types.
 */
export interface ReconciliationDataViewService {
  reconcile: () => Promise<void>;
}

interface RunnerDeps {
  logger: Logger;
  internalSavedObjectsRepository: ISavedObjectsRepository;
  unsecuredSavedObjectsClient: ReconciliationSavedObjectsFinder;
  writer: CasesAnalyticsWriterContract;
  /**
   * Optional. When provided (in production wiring), the runner also refreshes
   * the data view runtime fields each tick — backstops `onTemplateChanged`
   * events that may have been missed (transient ES error, node down at
   * write-time, etc.).
   */
  dataViewService?: ReconciliationDataViewService;
}

const PAGE_SIZE = 100;

/**
 * Maximum consecutive failing ticks before the runner gives up and advances
 * the watermark anyway. Without this circuit-breaker, a single poison-pill SO
 * (one whose write deterministically fails — bad mapping, malformed payload,
 * etc.) would block the watermark forever, and every subsequent tick would
 * re-walk the same growing window of SOs only to fail again.
 *
 * Five ticks at the default 30-minute interval = ~2.5 hours of retries before
 * the runner moves past the bad SO. After that, the offending SO is
 * permanently skipped from reconciliation and operators must run a manual
 * backfill (`POST /internal/cases/_analytics/backfill/run_soon`) to retry it.
 * The give-up is logged at ERROR with full counters so on-call sees it.
 */
const MAX_CONSECUTIVE_FAILURES = 5;

/**
 * Reconciliation runner — the durability backstop for the synchronous writer.
 *
 * On each task tick:
 * 1. Read the last successful run timestamp + consecutive_failure_count from
 *    the state SO.
 * 2. Walk every case SO updated since that timestamp (across all spaces),
 *    awaiting writes via `writer.awaited.*` so failures are visible.
 * 3. Walk every user-action SO created since that timestamp.
 * 4. Recompute lifecycle docs for every case touched.
 * 5. Optionally refresh data view runtime fields.
 * 6. Decide whether to advance the watermark:
 *    - If everything succeeded: advance, reset failure counter.
 *    - If there were any failures and we're under the circuit-breaker
 *      threshold: keep the same watermark, bump the failure counter so the
 *      next tick re-walks the same window.
 *    - If we've exceeded the threshold: advance anyway, log critical, reset
 *      counter. (Otherwise a single poison-pill SO blocks reconciliation
 *      indefinitely.)
 *
 * Per-write retries (3 jittered attempts) live inside the writer. The
 * tick-level circuit breaker stacks ON TOP of those — total max retries for a
 * given SO before being skipped is `3 in-call * MAX_CONSECUTIVE_FAILURES = 15`.
 */
export const runReconciliation = async ({
  logger,
  internalSavedObjectsRepository,
  unsecuredSavedObjectsClient,
  writer,
  dataViewService,
}: RunnerDeps): Promise<void> => {
  const log = logger.get('cases.analytics.reconciliation');
  const startedAt = Date.now();
  log.debug('reconciliation tick starting');

  const previousState = await readState(internalSavedObjectsRepository, log);
  const since = previousState?.last_run_at ?? null;
  const previousFailureCount = previousState?.consecutive_failure_count ?? 0;

  const stats = {
    cases_indexed: 0,
    activity_indexed: 0,
    lifecycle_indexed: 0,
    cases_failed: 0,
    activity_failed: 0,
    lifecycle_failed: 0,
  };

  let tickFailedSomewhere = false;

  try {
    const caseResults = await reconcileCases({ log, unsecuredSavedObjectsClient, writer, since });
    stats.cases_indexed = caseResults.succeeded;
    stats.cases_failed = caseResults.failed;

    const activityResults = await reconcileActivity({
      log,
      unsecuredSavedObjectsClient,
      writer,
      since,
    });
    stats.activity_indexed = activityResults.succeeded;
    stats.activity_failed = activityResults.failed;

    const lifecycleResults = await reconcileLifecycle({
      log,
      unsecuredSavedObjectsClient,
      writer,
      since,
    });
    stats.lifecycle_indexed = lifecycleResults.succeeded;
    stats.lifecycle_failed = lifecycleResults.failed;

    tickFailedSomewhere =
      stats.cases_failed > 0 || stats.activity_failed > 0 || stats.lifecycle_failed > 0;

    // Backstop the data view runtime field sync. Runs after the SO sweep so a
    // newly-discovered template (added between ticks) gets its runtime fields
    // applied even if the in-process `onTemplateChanged` hook was missed.
    // Errors are logged inside the data view service; we don't want a runtime
    // field hiccup to block the watermark from advancing.
    if (dataViewService != null) {
      try {
        await dataViewService.reconcile();
      } catch (err) {
        log.warn(`data view reconcile failed during tick: ${err.message}`);
      }
    }

    const nextState = decideNextState({
      log,
      previousFailureCount,
      tickFailedSomewhere,
      currentWatermark: since,
      proposedWatermark: new Date(startedAt).toISOString(),
      stats,
      duration_ms: Date.now() - startedAt,
    });

    await writeState(internalSavedObjectsRepository, log, nextState);

    log.info(
      `reconciliation tick complete: indexed cases=${stats.cases_indexed} activity=${
        stats.activity_indexed
      } lifecycle=${stats.lifecycle_indexed}; failed cases=${stats.cases_failed} activity=${
        stats.activity_failed
      } lifecycle=${stats.lifecycle_failed}; watermark=${
        nextState.last_run_at
      } consecutive_failures=${nextState.consecutive_failure_count ?? 0} duration_ms=${
        Date.now() - startedAt
      }`
    );
  } catch (err) {
    log.error(`reconciliation tick failed: ${err.message}`);
    // Do NOT advance the watermark on infrastructure failure (couldn't read
    // SOs at all, etc.) — the next run picks up where we left off.
  }
};

/**
 * Counters built up during the tick, before the duration_ms is folded in.
 * Kept separate from `last_run_stats` (which carries duration_ms too) so the
 * call sites that don't yet know the duration can build it up incrementally.
 */
type TickCounters = Omit<
  NonNullable<CasesAnalyticsStateAttributes['last_run_stats']>,
  'duration_ms'
>;

const decideNextState = ({
  log,
  previousFailureCount,
  tickFailedSomewhere,
  currentWatermark,
  proposedWatermark,
  stats,
  duration_ms,
}: {
  log: Logger;
  previousFailureCount: number;
  tickFailedSomewhere: boolean;
  currentWatermark: string | null;
  proposedWatermark: string;
  stats: TickCounters;
  duration_ms: number;
}): CasesAnalyticsStateAttributes => {
  const baseStats = { ...stats, duration_ms };

  if (!tickFailedSomewhere) {
    // Happy path — full success. Advance watermark and reset the failure
    // counter so we restart fresh next time something does fail.
    return {
      last_run_at: proposedWatermark,
      last_run_stats: baseStats,
      consecutive_failure_count: 0,
    };
  }

  const nextFailureCount = previousFailureCount + 1;

  if (nextFailureCount < MAX_CONSECUTIVE_FAILURES) {
    // Still within the retry window. Keep the watermark put so the next tick
    // re-walks the same SOs. Bump the failure counter so we eventually give
    // up rather than retrying forever on a poison pill.
    log.warn(
      `reconciliation tick had failures (${stats?.cases_failed ?? 0} case + ${
        stats?.activity_failed ?? 0
      } activity + ${
        stats?.lifecycle_failed ?? 0
      } lifecycle); holding watermark, retry ${nextFailureCount}/${MAX_CONSECUTIVE_FAILURES}`
    );
    return {
      last_run_at: currentWatermark,
      last_run_stats: baseStats,
      consecutive_failure_count: nextFailureCount,
    };
  }

  // Circuit breaker — too many consecutive failing ticks. Advance the
  // watermark anyway so we don't get stuck forever. The offending SOs are now
  // permanently skipped from reconciliation; operators must run a manual
  // backfill to retry them. Logged at ERROR so on-call sees it.
  log.error(
    `reconciliation circuit breaker tripped: ${nextFailureCount} consecutive failing ticks. Advancing watermark to skip the failing window. Run backfill to retry; see /internal/cases/_analytics/backfill/run_soon.`
  );
  return {
    last_run_at: proposedWatermark,
    last_run_stats: baseStats,
    consecutive_failure_count: 0,
  };
};

const readState = async (
  repo: ISavedObjectsRepository,
  log: Logger
): Promise<CasesAnalyticsStateAttributes | null> => {
  try {
    const doc = await repo.get<CasesAnalyticsStateAttributes>(
      CASES_ANALYTICS_STATE_SO_TYPE,
      CASES_ANALYTICS_STATE_SO_ID
    );
    return doc.attributes;
  } catch (err) {
    if (err?.output?.statusCode === 404) {
      log.debug('no prior state — first reconciliation run');
      return null;
    }
    throw err;
  }
};

const writeState = async (
  repo: ISavedObjectsRepository,
  log: Logger,
  attributes: CasesAnalyticsStateAttributes
): Promise<void> => {
  try {
    await repo.create(CASES_ANALYTICS_STATE_SO_TYPE, attributes, {
      id: CASES_ANALYTICS_STATE_SO_ID,
      overwrite: true,
    });
  } catch (err) {
    log.warn(`failed to persist reconciliation state: ${err.message}`);
  }
};

interface BatchResult {
  succeeded: number;
  failed: number;
}

const reconcileCases = async ({
  log,
  unsecuredSavedObjectsClient,
  writer,
  since,
}: {
  log: Logger;
  unsecuredSavedObjectsClient: ReconciliationSavedObjectsFinder;
  writer: CasesAnalyticsWriterContract;
  since: string | null;
}): Promise<BatchResult> => {
  const filter = since ? `${CASE_SAVED_OBJECT}.attributes.updated_at >= "${since}"` : undefined;

  let succeeded = 0;
  let failed = 0;
  for await (const batch of pagedFind<CasePersistedAttributes>({
    unsecuredSavedObjectsClient,
    type: CASE_SAVED_OBJECT,
    filter,
  })) {
    const results = await Promise.all(batch.map((so) => writer.awaited.upsertCase(so)));
    for (const ok of results) {
      if (ok) succeeded += 1;
      else failed += 1;
    }
  }
  log.debug(`reconciled cases: succeeded=${succeeded} failed=${failed}`);
  return { succeeded, failed };
};

const reconcileLifecycle = async ({
  log,
  unsecuredSavedObjectsClient,
  writer,
  since,
}: {
  log: Logger;
  unsecuredSavedObjectsClient: ReconciliationSavedObjectsFinder;
  writer: CasesAnalyticsWriterContract;
  since: string | null;
}): Promise<BatchResult> => {
  const filter = since
    ? `${CASE_SAVED_OBJECT}.attributes.updated_at >= "${since}" or ${CASE_SAVED_OBJECT}.attributes.closed_at >= "${since}"`
    : undefined;

  let succeeded = 0;
  let failed = 0;
  for await (const batch of pagedFind<CasePersistedAttributes>({
    unsecuredSavedObjectsClient,
    type: CASE_SAVED_OBJECT,
    filter,
  })) {
    const results = await Promise.all(batch.map((so) => writer.awaited.recomputeLifecycle(so.id)));
    for (const ok of results) {
      if (ok) succeeded += 1;
      else failed += 1;
    }
  }
  log.debug(`reconciled lifecycle: succeeded=${succeeded} failed=${failed}`);
  return { succeeded, failed };
};

const reconcileActivity = async ({
  log,
  unsecuredSavedObjectsClient,
  writer,
  since,
}: {
  log: Logger;
  unsecuredSavedObjectsClient: ReconciliationSavedObjectsFinder;
  writer: CasesAnalyticsWriterContract;
  since: string | null;
}): Promise<BatchResult> => {
  const filter = since
    ? `${CASE_USER_ACTION_SAVED_OBJECT}.attributes.created_at >= "${since}"`
    : undefined;

  let succeeded = 0;
  let failed = 0;
  for await (const batch of pagedFind<UserActionPersistedAttributes>({
    unsecuredSavedObjectsClient,
    type: CASE_USER_ACTION_SAVED_OBJECT,
    filter,
  })) {
    const results = await Promise.all(batch.map((so) => writer.awaited.appendActivity(so)));
    for (const ok of results) {
      if (ok) succeeded += 1;
      else failed += 1;
    }
  }
  log.debug(`reconciled activity: succeeded=${succeeded} failed=${failed}`);
  return { succeeded, failed };
};

async function* pagedFind<T>({
  unsecuredSavedObjectsClient,
  type,
  filter,
}: {
  unsecuredSavedObjectsClient: ReconciliationSavedObjectsFinder;
  type: string;
  filter?: string;
}): AsyncGenerator<Array<SavedObject<T>>> {
  let page = 1;
  while (true) {
    const res = await unsecuredSavedObjectsClient.find<T>({
      type,
      page,
      perPage: PAGE_SIZE,
      namespaces: ['*'],
      filter,
      sortField: 'updated_at',
      sortOrder: 'asc',
    });
    if (res.saved_objects.length === 0) {
      return;
    }
    yield res.saved_objects;
    if (res.saved_objects.length < PAGE_SIZE) {
      return;
    }
    page += 1;
  }
}

// Exported for tests.
export const __testing__ = {
  decideNextState,
  MAX_CONSECUTIVE_FAILURES,
};
