/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { CasesAnalyticsV2WriterContract } from '../writer';
import type { CasesActivityV2WriterContract } from '../writer/activity';
import type { CasesAttachmentsV2WriterContract } from '../writer/attachments';
import { runReconciliation, type RunReconciliationResult } from './runner';
import { runActivityReconciliation, type RunActivityReconciliationResult } from './activity_runner';
import {
  runAttachmentsReconciliation,
  type RunAttachmentsReconciliationResult,
} from './attachments_runner';
import { resetReconciliationTask } from '.';

/** Inputs for `runFullReset`. */
export interface RunFullResetDeps {
  /** Internal (no request scope) SO client. Same one the periodic task uses. */
  savedObjectsClient: SavedObjectsClientContract;
  /** Cases-surface writer. Real instance, not the noop. */
  writer: CasesAnalyticsV2WriterContract;
  /** Activity-surface writer. Real instance, not the noop. */
  activityWriter: CasesActivityV2WriterContract;
  /** Attachments-surface writer. Real instance, not the noop. */
  attachmentsWriter: CasesAttachmentsV2WriterContract;
  /**
   * Task Manager start contract. Used after both walks complete to
   * atomically reset the periodic reconciliation task's persisted state.
   * See `resetReconciliationTask` in `./index.ts` for why
   * `bulkUpdateState` is preferred over `remove`+`schedule`.
   *
   * Optional so the function stays callable in environments where Task
   * Manager isn't available; the cursor seed is skipped in that case.
   */
  taskManager: TaskManagerStartContract | null;
  /** Periodic-task cadence; threaded through to `resetReconciliationTask`. */
  intervalMinutes: number;
  /**
   * Inter-page sleep for the reconciliation runners, in milliseconds.
   * Sourced from `xpack.cases.analyticsV2.resetPageDelayMs`. The runners
   * default to `0` (yield via `setImmediate`); administrators raise this on
   * busy clusters to throttle bulk-write pressure during the full
   * backfill.
   */
  pageDelayMs: number;
  /**
   * Optional progress callback fired after each runner page completes.
   * `phase` discriminates which surface the completed page belongs to
   * (the surfaces are walked concurrently), and
   * `processed` is the cumulative count for that surface so the caller
   * (the reset task) can write live counts without per-page bookkeeping.
   *
   * Synchronous and non-blocking. Callers throttle downstream I/O (e.g.
   * `bulkUpdateState`) themselves so the per-page semantics here stay
   * obvious.
   */
  onProgress?: (info: { phase: 'cases' | 'activity' | 'attachments'; processed: number }) => void;
  /**
   * Optional cooperative-cancellation signal from Task Manager, threaded
   * into each surface runner. When aborted, each in-flight walk throws at
   * its next page boundary; per-surface isolation captures the abort as
   * that surface's `*Error`, and its cursor is left unseeded so the next
   * periodic tick re-walks it. A reset cancelled part-way therefore leaves
   * the indices partially populated and self-heals on the next tick.
   */
  signal?: AbortSignal;
  logger: Logger;
}

export interface RunFullResetResult {
  /** Per-surface walk outcomes. `null` if that surface's walk threw mid-flight. */
  cases: RunReconciliationResult | null;
  activity: RunActivityReconciliationResult | null;
  attachments: RunAttachmentsReconciliationResult | null;
  /**
   * ISO timestamp seeded into the periodic task's cases-surface
   * cursor on a successful walk, or `null` when the cases walk
   * failed. Seeding `null` clears the persisted cursor so the next
   * periodic tick falls back to a full cases walk and recovers any
   * docs the failed reset missed.
   */
  casesCursor: string | null;
  /**
   * ISO timestamp seeded into the periodic task's activity-surface
   * cursor on a successful walk, or `null` when the activity walk
   * failed. Same recovery semantics as `casesCursor`.
   */
  activityCursor: string | null;
  /**
   * ISO timestamp seeded into the periodic task's attachments-surface
   * cursor on a successful walk, or `null` when the attachments walk
   * failed. Same recovery semantics as `casesCursor`.
   */
  attachmentsCursor: string | null;
  /**
   * Per-walk error captured for surface-level isolation. `null` on
   * success. Surfaced so callers can decide whether to log or report a
   * partial failure; this function never throws on a per-surface walk
   * error, so the successful surfaces' cursors still get seeded.
   */
  casesError: unknown;
  activityError: unknown;
  attachmentsError: unknown;
}

/**
 * The walk-and-seed phase of a full subsystem reset. Invoked by the
 * one-shot Task Manager job `cases.analyticsV2.fullReset`, which is what
 * lets `/reset` return 202 in seconds at large-tenant scale instead of
 * timing out the HTTP request mid-walk.
 *
 * Out of scope here: dropping indices, recreating indices, deleting
 * per-space data views, and clearing the bootstrap cache. Those steps
 * stay in the `/reset` handler because they're `O(spaces)` (fast) and
 * benefit from running synchronously inside the request so the administrator
 * gets immediate confirmation that destructive cleanup succeeded before
 * the much slower walk begins.
 *
 * Per-surface failure isolation: a failure on one surface logs at WARN,
 * is captured in the result, and lets the other surface proceed. The
 * cursor-seed step still runs so the surface that succeeded keeps its
 * progress.
 *
 * Cursor-seed failure is logged at WARN but does not throw. The
 * worst-case effect is that the periodic task re-walks the whole tenant
 * on its next tick — annoying, but not data-corrupting.
 */
export async function runFullReset({
  savedObjectsClient,
  writer,
  activityWriter,
  attachmentsWriter,
  taskManager,
  intervalMinutes,
  pageDelayMs,
  onProgress,
  signal,
  logger,
}: RunFullResetDeps): Promise<RunFullResetResult> {
  // Walk the three surfaces CONCURRENTLY. They write to independent indices
  // and open independent PITs, so there's no ordering dependency during a
  // full rebuild — the "cases first" ordering the periodic tick keeps for
  // `LOOKUP JOIN .cases` freshness is unnecessary here because the backfill
  // converges once all three finish (a brief window where an activity /
  // attachment row's joined case row isn't there yet is fine mid-rebuild).
  // Running them in parallel makes the reset wall-clock the single slowest
  // surface instead of the sum of all three, so attachments no longer waits
  // behind cases + activity. Each walk swallows its own error into the
  // matching `*Error` var, so `Promise.all` never rejects; per-surface
  // isolation and cursor seeding are preserved.
  //
  // Note: `onProgress` still tags each page with its surface so the reset
  // task can route the cumulative count to the right per-surface
  // `*_processed` field — those stay accurate under parallelism. The reset
  // task's coarse `phase` field stays `'running'` for the whole walk (it no
  // longer names a single "current" surface, since all three walk at once);
  // the per-surface counts are the source of truth for progress.
  // Each surface returns its own `{ result, error }` so the outcome is read
  // off the typed `Promise.all` tuple rather than reassigning outer `let`s
  // from inside the closures (which defeats TS control-flow narrowing).
  const [casesOutcome, activityOutcome, attachmentsOutcome] = await Promise.all([
    (async (): Promise<{ result: RunReconciliationResult | null; error: unknown }> => {
      try {
        const result = await runReconciliation({
          savedObjectsClient,
          writer,
          logger,
          lastRunAt: undefined,
          pageDelayMs,
          signal,
          // Wrap the surface-agnostic runner callback to attach a phase tag.
          // Keeps the runners themselves unaware of which surface they're
          // serving.
          onPageComplete: ({ processed }) => onProgress?.({ phase: 'cases', processed }),
        });
        return { result, error: null };
      } catch (err) {
        logger.warn(
          `reset: full cases re-walk failed mid-flight: ${
            err instanceof Error ? err.message : String(err)
          }. Index is partially populated; the cases cursor is left unset so the next periodic tick will fall back to a full walk and recover the missing docs.`
        );
        return { result: null, error: err };
      }
    })(),
    (async (): Promise<{ result: RunActivityReconciliationResult | null; error: unknown }> => {
      try {
        const result = await runActivityReconciliation({
          savedObjectsClient,
          activityWriter,
          logger,
          lastRunAt: undefined,
          pageDelayMs,
          signal,
          onPageComplete: ({ processed }) => onProgress?.({ phase: 'activity', processed }),
        });
        return { result, error: null };
      } catch (err) {
        logger.warn(
          `reset: full activity re-walk failed mid-flight: ${
            err instanceof Error ? err.message : String(err)
          }. Activity index is partially populated; the activity cursor is left unset so the next periodic tick will fall back to a full walk and recover the missing docs.`
        );
        return { result: null, error: err };
      }
    })(),
    (async (): Promise<{
      result: RunAttachmentsReconciliationResult | null;
      error: unknown;
    }> => {
      try {
        const result = await runAttachmentsReconciliation({
          savedObjectsClient,
          attachmentsWriter,
          logger,
          lastRunAt: undefined,
          pageDelayMs,
          signal,
          onPageComplete: ({ processed }) => onProgress?.({ phase: 'attachments', processed }),
        });
        return { result, error: null };
      } catch (err) {
        logger.warn(
          `reset: full attachments re-walk failed mid-flight: ${
            err instanceof Error ? err.message : String(err)
          }. Attachments index is partially populated; the attachments cursor is left unset so the next periodic tick will fall back to a full walk and recover the missing docs.`
        );
        return { result: null, error: err };
      }
    })(),
  ]);

  const casesResult = casesOutcome.result;
  const casesError = casesOutcome.error;
  const activityResult = activityOutcome.result;
  const activityError = activityOutcome.error;
  const attachmentsResult = attachmentsOutcome.result;
  const attachmentsError = attachmentsOutcome.error;

  // Per-surface cursor: the walk's tick-start timestamp on success, or
  // `null` on failure. Seeding `null` clears the persisted cursor so
  // the next periodic tick walks the whole surface and repairs any
  // docs the failed reset left behind.
  const casesCursor = casesResult?.newLastRunAt ?? null;
  const activityCursor = activityResult?.newLastRunAt ?? null;
  const attachmentsCursor = attachmentsResult?.newLastRunAt ?? null;

  if (taskManager != null) {
    // Build the seed state with only the surfaces whose cursor we want
    // to persist. Omitting a key on failure leaves that surface
    // cursorless, which the periodic runner treats as a fresh start
    // (see the `lastRunAt ? ... : undefined` filter in `runner.ts`).
    const initialState: Record<string, string> = {};
    if (casesCursor != null) initialState.cases_last_run_at = casesCursor;
    if (activityCursor != null) initialState.activity_last_run_at = activityCursor;
    if (attachmentsCursor != null) initialState.attachments_last_run_at = attachmentsCursor;
    try {
      await resetReconciliationTask({
        taskManager,
        logger,
        intervalMinutes,
        initialState,
      });
    } catch (err) {
      logger.warn(
        `reset: failed to seed reconciliation cursors: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  return {
    cases: casesResult,
    activity: activityResult,
    attachments: attachmentsResult,
    casesCursor,
    activityCursor,
    attachmentsCursor,
    casesError,
    activityError,
    attachmentsError,
  };
}
