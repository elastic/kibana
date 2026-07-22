/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import type {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { CasesAnalyticsV2WriterContract } from '../writer';
import type { CasesActivityV2WriterContract } from '../writer/activity';
import type { CasesAttachmentsV2WriterContract } from '../writer/attachments';
import { runFullReset } from './reset_runner';

/**
 * Task type registered with Task Manager for the one-shot full reset.
 * Distinct from `cases.analyticsV2.reconciliation` (the recurring
 * incremental task) so the two get independent timeouts, retry policies,
 * and queue accounting. The reset task's `timeout` is configurable via
 * `xpack.cases.analyticsV2.resetTaskTimeoutMinutes` (default 60m, max
 * 24h); the recurring task uses Task Manager's default because each
 * periodic tick is `O(delta)` and finishes in seconds at any tenant size.
 */
export const RESET_TASK_TYPE = 'cases.analyticsV2.fullReset';

/**
 * Singleton reset task instance id. Fixed (not per-`/reset`-call) so a
 * second `/reset` cleanly replaces a still-running first call:
 *   1. `/reset` handler calls `scheduleResetTask`
 *   2. `scheduleResetTask` calls `taskManager.removeIfExists(RESET_TASK_ID)`
 *      to remove the SO; the in-flight runner stops being claimed on the
 *      next polling cycle.
 *   3. `scheduleResetTask` calls `taskManager.schedule({ id: RESET_TASK_ID, ... })`
 *      to create a fresh instance.
 *
 * A per-call unique id would let two `/reset` calls race concurrent walks
 * on the same indices. Idempotent on `_id` so correctness would be fine,
 * but ES would see double the bulk pressure for no benefit.
 * Latest-call-wins via this singleton id is the right semantic.
 *
 * Exported because `/state` queries the same id to surface progress
 * under `active_reset`.
 */
export const RESET_TASK_ID = 'cases-analyticsV2-reset';

/**
 * State persisted to the reset task SO. Written at two moments:
 *   1. Mid-run progress: a wall-clock-throttled wrapper around
 *      `taskManager.bulkUpdateState` pushes `phase`, the per-surface
 *      `*_processed` counts, and `started_at` every ~30s during the
 *      walk so `/state.active_reset.state` reflects live progress.
 *      Fields not yet known stay at their initial values.
 *   2. Final return: the runner returns the fully-populated shape at the
 *      end of `run()`. Task Manager writes it and (on success)
 *      auto-removes the SO shortly after. A `/state` call landing in
 *      that brief window sees the complete final state.
 *
 * On total failure (every surface threw) the runner throws instead of
 * returning, which preserves the SO with the most recent throttled
 * write — so the per-surface `*_processed` counts still reflect how far
 * each concurrent walk got before the throw.
 */
export interface ResetTaskState {
  /**
   * Coarse task phase. `'running'` while the walk is in flight,
   * `'completed'` on the final-state write. The three surfaces are
   * walked concurrently, so there is no single "surface currently being
   * walked" to report here — per-surface progress lives in the
   * `*_processed` counts below. On total failure the SO is preserved
   * with `phase: 'running'` (the last throttled write before the throw).
   */
  phase: 'running' | 'completed' | null;
  /**
   * Cumulative cases-surface processed count. Updates live throughout
   * the walk via the throttled progress writer. Because the three
   * surfaces run concurrently, this advances alongside
   * `activity_processed` and `attachments_processed` rather than one
   * surface at a time. `null` until the first cases page completes.
   */
  cases_processed: number | null;
  /** Cumulative activity-surface processed count. Same lifecycle as `cases_processed`. */
  activity_processed: number | null;
  /** Cumulative attachments-surface processed count. Same lifecycle as `cases_processed`. */
  attachments_processed: number | null;
  /** Periodic-task cursors seeded after all walks complete. Final-write only. */
  cases_cursor: string | null;
  activity_cursor: string | null;
  attachments_cursor: string | null;
  /** Wall-clock at task-runner entry. Set in the initial throttled write. */
  started_at: string;
  /** Wall-clock at task-runner exit. Final-write only; null mid-run. */
  completed_at: string | null;
  /**
   * Per-surface error message if a walk threw. Final-write only.
   * `runFullReset`'s per-surface isolation captures these in the result
   * rather than propagating; stashing the message here lets `/state`
   * consumers distinguish "succeeded" from "succeeded with a partial
   * failure on surface X" without parsing logs.
   */
  cases_error: string | null;
  activity_error: string | null;
  attachments_error: string | null;
  [key: string]: unknown;
}

/**
 * Wall-clock interval between throttled progress writes during the
 * reset walk. 30 seconds is a compromise:
 *   - Faster (e.g. 5s): better live UX in `/state` but ~6× more SO
 *     writes against `.kibana_task_manager`. Still negligible
 *     absolutely, but visible at scale.
 *   - Slower (e.g. 5m): fewer writes but administrators see stale numbers
 *     for minutes at a time, which feels broken.
 */
const PROGRESS_WRITE_INTERVAL_MS = 30_000;

interface RegisterResetTaskArgs {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  /**
   * Task `timeout` in minutes. Sourced from
   * `xpack.cases.analyticsV2.resetTaskTimeoutMinutes` (config schema:
   * `defaultValue: 60, min: 5, max: 1440`). Must be set at task-type
   * registration; Task Manager's `timeout` field is not per-instance.
   */
  timeoutMinutes: number;
  /**
   * `xpack.cases.analyticsV2.resetPageDelayMs`. Passed through to the
   * reconciliation runners' inter-page sleep. Administrators raise this on
   * busy clusters to throttle bulk-write pressure during the backfill.
   * `0` (default) = no throttle; runners still yield via `setImmediate`.
   */
  pageDelayMs: number;
  /**
   * Periodic-task cadence, threaded through to `runFullReset` so the
   * post-walk seed step uses the configured interval rather than a
   * hard-coded default.
   */
  reconciliationIntervalMinutes: number;
  /**
   * Late-bound deps. Same closure pattern as the periodic task: Task
   * Manager constructs runners after plugin `setup()` returns, so the
   * SO client, writers, and TM start contract are resolved at run time
   * rather than baked in at registration.
   *
   * The `taskManager` field here is the start contract (needed by
   * `runFullReset` to seed the periodic task's cursors via
   * `bulkUpdateState`). The setup contract used to register this task
   * type is passed as `taskManager` on the outer args.
   */
  getRunnerDeps: () => Promise<{
    savedObjectsClient: SavedObjectsClientContract;
    writer: CasesAnalyticsV2WriterContract;
    activityWriter: CasesActivityV2WriterContract;
    attachmentsWriter: CasesAttachmentsV2WriterContract;
    taskManager: TaskManagerStartContract;
  }>;
}

/**
 * Registers the one-shot reset task type with Task Manager. Called from
 * plugin `setup()`, alongside `registerReconciliationTask`. Scheduling
 * an instance happens later, on demand from the `/reset` route.
 */
export function registerResetTask({
  taskManager,
  logger,
  timeoutMinutes,
  pageDelayMs,
  reconciliationIntervalMinutes,
  getRunnerDeps,
}: RegisterResetTaskArgs): void {
  taskManager.registerTaskDefinitions({
    [RESET_TASK_TYPE]: {
      title: 'Cases analytics v2 full reset',
      description:
        'One-shot full backfill of the .cases, .cases-activity, and .cases-attachments analytics indices. Scheduled by POST /internal/cases/_analyticsV2/reset; runs the same walks the periodic reconciliation task does, but with lastRunAt: undefined so every doc is re-emitted.',
      // Configurable per-tenant; at 10K spaces / ~15M activity docs the
      // default 60m is too low and administrators raise it in `kibana.yml`.
      // The config schema's `max: 1440` keeps it bounded. Task Manager
      // parses the `${N}m` string form for timeout.
      timeout: `${timeoutMinutes}m`,
      // No auto-retry. A failed reset must not silently re-run an hour
      // later: the administrator should see `active_reset.status: 'failed'`
      // in `/state` and decide whether to re-invoke `/reset` after
      // fixing the underlying cause. Auto-retry would also stack a
      // second long walk on top of an already-stressed cluster, which
      // is the opposite of what a failure (often caused by ES pressure)
      // calls for.
      maxAttempts: 1,
      createTaskRunner: ({ abortController }) => ({
        run: async () => {
          // Throws on total failure, returns on success or partial
          // success. Task Manager auto-deletes one-shot tasks (no
          // `schedule.interval`) the moment `run()` returns successfully
          // — see `processResultWhenDone` in
          // `task_running/task_runner.ts`. That's correct for the happy
          // path but means `/state.active_reset` would return `null`
          // immediately after a failure too, hiding it. Throwing on
          // total failure keeps the SO alive with `status: 'failed'` so
          // the administrator polling `/state` can react.
          //
          // Trade-off: Task Manager metrics report partial-failure runs
          // as successful. Acceptable because per-surface failures are
          // already logged at WARN by `runFullReset`, and the failed
          // surface's cursor is omitted from the seed so the next
          // periodic tick walks the whole surface and recovers any
          // docs the partial walk missed.
          const startedAt = new Date().toISOString();
          const deps = await getRunnerDeps();

          // Live progress state. Mutated synchronously by the
          // `onProgress` callback wired below and periodically flushed
          // to the task SO by the throttled writer. The throttled writer
          // reads from this same reference (no copy) so each flush
          // captures whatever the most recent page reported.
          const liveState: ResetTaskState = {
            phase: 'running',
            cases_processed: null,
            activity_processed: null,
            attachments_processed: null,
            cases_cursor: null,
            activity_cursor: null,
            attachments_cursor: null,
            started_at: startedAt,
            completed_at: null,
            cases_error: null,
            activity_error: null,
            attachments_error: null,
          };

          const flushProgress = async () => {
            try {
              await deps.taskManager.bulkUpdateState([RESET_TASK_ID], () => ({ ...liveState }));
            } catch (err) {
              // Common transient causes:
              //   - 404: the SO was removed by a concurrent `/reset`
              //     (latest-wins). Task Manager stops claiming this
              //     runner on the next poll.
              //   - 409 (version conflict): another node updated the SO
              //     between read and write. Next throttle cycle retries.
              // Progress writes are advisory; don't fail the walk on a
              // write error.
              logger.debug(
                `cases-analyticsV2: reset progress write failed (non-fatal): ${
                  err instanceof Error ? err.message : String(err)
                }`
              );
            }
          };
          const throttledFlush = makeWallClockThrottle(flushProgress, PROGRESS_WRITE_INTERVAL_MS);

          try {
            // Initial flush so `/state.active_reset.state` shows
            // `phase: 'running', started_at: ...` immediately rather than
            // the placeholder `{}` Task Manager wrote at schedule time.
            // The first `onProgress` callback would also fire this
            // (leading edge), but the first page can be slow on a cold
            // ES; without this, the administrator sees `state: {}` for
            // seconds.
            throttledFlush.schedule();

            const result = await runFullReset({
              savedObjectsClient: deps.savedObjectsClient,
              writer: deps.writer,
              activityWriter: deps.activityWriter,
              attachmentsWriter: deps.attachmentsWriter,
              taskManager: deps.taskManager,
              intervalMinutes: reconciliationIntervalMinutes,
              pageDelayMs,
              // Task Manager aborts this controller on timeout / shutdown;
              // threaded into each surface walk so a cancelled reset bails
              // at the next page boundary instead of running to completion.
              signal: abortController.signal,
              logger,
              onProgress: ({ phase, processed }) => {
                // The three surfaces walk concurrently, so `phase` here is
                // only the per-page discriminator for routing the count to
                // the right surface — the top-level `liveState.phase` stays
                // `'running'` for the whole walk (see `ResetTaskState.phase`).
                if (phase === 'cases') {
                  liveState.cases_processed = processed;
                } else if (phase === 'activity') {
                  liveState.activity_processed = processed;
                } else {
                  liveState.attachments_processed = processed;
                }
                throttledFlush.schedule();
              },
            });

            const completedAt = new Date().toISOString();
            const casesErrorMessage = errorToMessage(result.casesError);
            const activityErrorMessage = errorToMessage(result.activityError);
            const attachmentsErrorMessage = errorToMessage(result.attachmentsError);

            const finalState: ResetTaskState = {
              phase: 'completed',
              cases_processed: result.cases?.processed ?? liveState.cases_processed,
              activity_processed: result.activity?.processed ?? liveState.activity_processed,
              attachments_processed:
                result.attachments?.processed ?? liveState.attachments_processed,
              cases_cursor: result.casesCursor,
              activity_cursor: result.activityCursor,
              attachments_cursor: result.attachmentsCursor,
              started_at: startedAt,
              completed_at: completedAt,
              cases_error: casesErrorMessage,
              activity_error: activityErrorMessage,
              attachments_error: attachmentsErrorMessage,
            };

            // Every surface failed: throw so the SO survives with
            // `status: 'failed'` and the most recent throttled
            // `liveState` (capturing how far each walk got). The
            // message includes every per-surface error so consumers can
            // distinguish from a deps-resolution failure.
            if (
              result.casesError != null &&
              result.activityError != null &&
              result.attachmentsError != null
            ) {
              throw new Error(
                `cases-analyticsV2: full reset failed on every surface. cases: ${casesErrorMessage}. activity: ${activityErrorMessage}. attachments: ${attachmentsErrorMessage}`
              );
            }

            // Success or partial success: return so Task Manager
            // self-deletes the SO. The returned `state` is written to
            // the SO momentarily before deletion, so a `/state` call
            // landing in that window sees the final counts and
            // `phase: 'completed'` — the differentiator from a still-
            // running task.
            return { state: finalState };
          } finally {
            // Cancel any pending trailing-edge flush so it doesn't fire
            // after `run()` returns and either clobber the final state
            // (between Task Manager's write and its SO removal) or hit
            // a 404 against the now-removed SO.
            throttledFlush.cancel();
          }
        },
        cancel: async () => {
          // No long-lived resources to release beyond the abort signal
          // Task Manager already trips (threaded into every surface walk
          // via `runFullReset`, checked at each page boundary). The
          // in-flight page completes, then the walk throws and unwinds;
          // bulk dispatches are idempotent on `_id`, so a second `/reset`
          // rescheduling a fresh task while this one is still finishing
          // only causes extra ES traffic, no correctness impact.
        },
      }),
    },
  });
}

interface ScheduleResetTaskArgs {
  taskManager: TaskManagerStartContract;
  logger: Logger;
}

/**
 * Schedules a one-shot reset task instance. Calls `removeIfExists` first
 * so a second `/reset` cleanly replaces an in-flight reset rather than
 * racing it (see `RESET_TASK_ID`).
 *
 * Returns the scheduled task instance so the caller can include the task
 * id and `runAt` in the `/reset` 202 response.
 *
 * Throws on schedule failure; the route handler surfaces it. Schedule
 * failures are typically Task Manager being unavailable, which is a
 * 503-class problem the administrator should see.
 */
export async function scheduleResetTask({
  taskManager,
  logger,
}: ScheduleResetTaskArgs): Promise<ConcreteTaskInstance> {
  // Remove any existing reset SO so this call replaces it.
  // `removeIfExists` swallows the 404 path so the first-ever `/reset`
  // (no prior SO) doesn't throw. The runner of any already-claimed task
  // finishes on its own — see the `cancel` callback above.
  try {
    await taskManager.removeIfExists(RESET_TASK_ID);
  } catch (err) {
    // Non-404 removal failure is non-fatal: the worst case is that the
    // schedule call below fails with a version conflict, which the
    // route handler surfaces as a 500.
    logger.warn(
      `cases-analyticsV2: failed to remove existing reset task before reschedule: ${
        err instanceof Error ? err.message : String(err)
      }. Will attempt to schedule a fresh task anyway.`
    );
  }

  return taskManager.schedule({
    id: RESET_TASK_ID,
    taskType: RESET_TASK_TYPE,
    params: {},
    state: {},
    // No `schedule.interval` — this is a one-shot. `runAt` defaults to
    // "now", so Task Manager picks up the task on its next polling
    // cycle (default <5s).
  });
}

interface FetchResetTaskArgs {
  taskManager: TaskManagerStartContract;
  logger: Logger;
}

/**
 * Reads the current reset task SO if one exists, for `/state` to surface
 * under `active_reset`. Returns `null` when no reset has been scheduled
 * or the most recent one self-deleted after success.
 *
 * Task Manager doesn't auto-delete completed one-shot tasks — they sit
 * in the SO store with `status: 'idle'` (rescheduled to a far-future
 * `runAt`) or `status: 'failed'`. A non-null return here means "a reset
 * was scheduled at some point and its record still exists"; the caller
 * uses `status` to distinguish "running now" from "already completed".
 */
export async function fetchResetTask({
  taskManager,
  logger,
}: FetchResetTaskArgs): Promise<ConcreteTaskInstance | null> {
  try {
    return await taskManager.get(RESET_TASK_ID);
  } catch (err) {
    // 404 is common (no reset scheduled yet, or the SO was cleaned up
    // out of band) — treat as "no active reset" rather than an error.
    const status =
      (err as { statusCode?: number })?.statusCode ??
      (err as { output?: { statusCode?: number } })?.output?.statusCode;
    if (status === 404) return null;
    logger.warn(
      `cases-analyticsV2: failed to fetch reset task: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return null;
  }
}

/**
 * Maps a captured error (or `null`) to a human-readable message string
 * suitable for the `*_error` slots on `ResetTaskState`. Returns `null`
 * when the input is `null` so the SO field stays nullable.
 */
function errorToMessage(err: unknown): string | null {
  if (err == null) return null;
  return err instanceof Error ? err.message : String(err);
}

/**
 * Wall-clock-throttled fire-and-forget invoker. Used by the reset task
 * to write live progress into its task SO at most once per `intervalMs`
 * regardless of how often `schedule()` is called.
 *
 *   - First `schedule()` after construction (or after `intervalMs` since
 *     the last fire) invokes `fn` immediately, so `/state` reflects new
 *     state as soon as the first event arrives.
 *   - Subsequent calls within the throttle window coalesce into a single
 *     trailing-edge invocation at `lastFireAt + intervalMs`. The
 *     trailing fire reads `fn`'s closure at fire time so the latest
 *     state wins.
 *   - `cancel()` clears any pending trailing-edge timer. Idempotent.
 *     Must be called in a `finally` block so a flush can't fire after
 *     the task has returned and Task Manager has removed the SO.
 *
 * `fn` is invoked fire-and-forget; its returned Promise is not awaited.
 * The wrapper is for write-rate throttling, not async coordination, so
 * `fn` must swallow its own errors (the reset task's progress write
 * does).
 *
 * Module-private; lives here because the reset task is its only caller.
 */
function makeWallClockThrottle(
  fn: () => Promise<void>,
  intervalMs: number
): { schedule: () => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastFireAt = 0;

  const fire = () => {
    lastFireAt = Date.now();
    void fn();
  };

  return {
    schedule: () => {
      const now = Date.now();
      const elapsed = now - lastFireAt;
      if (elapsed >= intervalMs) {
        // Eligible to fire immediately (leading edge or post-window
        // re-fire). Defensively cancel any stale trailing-edge timer
        // first; a paused-then-resumed event loop could produce one.
        if (timer != null) {
          clearTimeout(timer);
          timer = null;
        }
        fire();
      } else if (timer == null) {
        // Coalesce into a trailing-edge fire at the next eligible
        // moment. Subsequent `schedule()` calls within the window hit
        // the `timer != null` no-op path.
        const remaining = intervalMs - elapsed;
        timer = setTimeout(() => {
          timer = null;
          fire();
        }, remaining);
      }
    },
    cancel: () => {
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
