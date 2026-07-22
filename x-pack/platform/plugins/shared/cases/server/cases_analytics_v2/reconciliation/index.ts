/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import {
  createTaskRunError,
  TaskErrorSource,
  type TaskManagerSetupContract,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { CasesAnalyticsV2WriterContract } from '../writer';
import type { CasesActivityV2WriterContract } from '../writer/activity';
import type { CasesAttachmentsV2WriterContract } from '../writer/attachments';
import { runReconciliation } from './runner';
import { runActivityReconciliation } from './activity_runner';
import { runAttachmentsReconciliation } from './attachments_runner';

/**
 * Task type registered with Task Manager. Namespaced with `cases.analyticsV2.`
 * so it's distinct from the v1 task types in `cases_analytics/`.
 */
export const RECONCILIATION_TASK_TYPE = 'cases.analyticsV2.reconciliation';

/**
 * Singleton task instance — one reconciliation task per cluster, regardless of
 * how many Kibana nodes are running. Task Manager assigns it to one node at a
 * time. The id is constant so concurrent boots converge on the same scheduled
 * task rather than each scheduling its own.
 *
 * Exported because administrator routes (`/reconcile/run_soon`, `/reset`)
 * need to pass it to `taskManager.runSoon(id)` — that API takes the task
 * **instance** id, not the task **type**.
 */
export const RECONCILIATION_TASK_ID = 'cases-analyticsV2-reconciliation';

interface RegisterReconciliationTaskArgs {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  /**
   * Late-bound deps. Task Manager constructs task runners well after plugin
   * `setup()` runs — the SO client and live writers are resolved at run
   * time via this closure rather than baked in at registration.
   *
   * All three writers are resolved here so a single tick can run cases,
   * activity, and attachments sequentially, sharing the SO client (one
   * client → one connection pool charge → consistent rate-limiting)
   * and dovetailing Task Manager's tick budget across all surfaces.
   */
  getRunnerDeps: () => Promise<{
    savedObjectsClient: SavedObjectsClientContract;
    writer: CasesAnalyticsV2WriterContract;
    activityWriter: CasesActivityV2WriterContract;
    attachmentsWriter: CasesAttachmentsV2WriterContract;
  }>;
}

/**
 * Persisted task state. Three cursors so the cases, activity, and
 * attachments surfaces advance independently: a transient ES blip on
 * one surface pins only its own cursor and never blocks the others
 * from progressing.
 */
interface ReconciliationTaskState {
  /** Cases-surface cursor (from `runReconciliation`). */
  cases_last_run_at?: string;
  /** Activity-surface cursor (from `runActivityReconciliation`). */
  activity_last_run_at?: string;
  /** Attachments-surface cursor (from `runAttachmentsReconciliation`). */
  attachments_last_run_at?: string;
}

/**
 * Registers the reconciliation task TYPE with Task Manager. Must be called
 * from plugin `setup()`. Scheduling the task instance happens separately in
 * `scheduleReconciliationTask`, from `start()`.
 */
export function registerReconciliationTask({
  taskManager,
  logger,
  getRunnerDeps,
}: RegisterReconciliationTaskArgs): void {
  taskManager.registerTaskDefinitions({
    [RECONCILIATION_TASK_TYPE]: {
      title: 'Cases analytics v2 reconciliation',
      description:
        'Periodically re-emits analytics docs for cases updated since the last successful tick. Durability backstop for the fire-and-forget write hooks.',
      // No auto-retry. The runner pins the cursor on failure and the
      // next scheduled tick re-walks the same window naturally. A retry
      // inside the same poll interval would stack a second failing run
      // on top of an already-stressed cluster — usually the cause of
      // the first failure — and increment the task's failure metric
      // twice. With `maxAttempts: 1`, recovery happens cleanly on the
      // next interval-driven run.
      maxAttempts: 1,
      createTaskRunner: ({ taskInstance, abortController }) => ({
        run: async () => {
          const previousState = (taskInstance.state ?? {}) as ReconciliationTaskState;
          const casesLastRunAt = clampCursorToNotFuture(previousState.cases_last_run_at, logger);
          const activityLastRunAt = clampCursorToNotFuture(
            previousState.activity_last_run_at,
            logger
          );
          const attachmentsLastRunAt = clampCursorToNotFuture(
            previousState.attachments_last_run_at,
            logger
          );

          // Carry the previous cursors forward as defaults; each surface
          // overwrites its own field on success and leaves it pinned on
          // failure. Per-surface isolation: an outage on one surface
          // doesn't pin the other surfaces' cursors.
          const nextState: Record<string, unknown> = {
            cases_last_run_at: casesLastRunAt,
            activity_last_run_at: activityLastRunAt,
            attachments_last_run_at: attachmentsLastRunAt,
          };

          const deps = await getRunnerDeps();

          // Cooperative cancellation. Task Manager aborts this controller
          // on timeout or shutdown; it never reads the signal itself, so
          // it's on us to observe it. The three surface walks are
          // independent and each pins its own cursor when it doesn't
          // complete, so the surface boundary is the natural bail-out
          // point: once aborted we skip the remaining walks and persist
          // whatever progress the completed surfaces made. A cancelled
          // surface leaves its cursor pinned, so the next tick re-walks
          // its window naturally.
          const { signal } = abortController;

          // Cases first (the dimension table). A `LOOKUP JOIN .cases
          // ON case.id` from any post-fact-table walk consumer then
          // always sees the joined case row at least as up-to-date as
          // the activity / attachment row that referenced it.
          let casesError: unknown;
          if (!signal.aborted) {
            try {
              const result = await runReconciliation({
                savedObjectsClient: deps.savedObjectsClient,
                writer: deps.writer,
                logger,
                lastRunAt: casesLastRunAt,
                signal,
              });
              nextState.cases_last_run_at = result.newLastRunAt;
            } catch (err) {
              casesError = err;
              logger.error(
                `cases-analyticsV2: cases reconciliation tick failed: ${
                  err instanceof Error ? err.message : String(err)
                }. Cursor pinned; activity + attachments surfaces still attempted.`,
                { error: err }
              );
            }
          }

          // Activity second. Independent of cases.
          let activityError: unknown;
          if (!signal.aborted) {
            try {
              const result = await runActivityReconciliation({
                savedObjectsClient: deps.savedObjectsClient,
                activityWriter: deps.activityWriter,
                logger,
                lastRunAt: activityLastRunAt,
                signal,
              });
              nextState.activity_last_run_at = result.newLastRunAt;
            } catch (err) {
              activityError = err;
              logger.error(
                `cases-analyticsV2: activity reconciliation tick failed: ${
                  err instanceof Error ? err.message : String(err)
                }. Activity cursor pinned; attachments surface still attempted.`,
                { error: err }
              );
            }
          }

          // Attachments third. Independent of cases + activity.
          let attachmentsError: unknown;
          if (!signal.aborted) {
            try {
              const result = await runAttachmentsReconciliation({
                savedObjectsClient: deps.savedObjectsClient,
                attachmentsWriter: deps.attachmentsWriter,
                logger,
                lastRunAt: attachmentsLastRunAt,
                signal,
              });
              nextState.attachments_last_run_at = result.newLastRunAt;
            } catch (err) {
              attachmentsError = err;
              logger.error(
                `cases-analyticsV2: attachments reconciliation tick failed: ${
                  err instanceof Error ? err.message : String(err)
                }. Attachments cursor pinned.`,
                { error: err }
              );
            }
          }

          // If the tick was cancelled mid-flight, log it once so the
          // skipped surfaces are visible in the task log rather than
          // looking like a silent no-op.
          if (signal.aborted) {
            logger.info(
              'cases-analyticsV2: reconciliation tick cancelled; skipped remaining surface walks. Pinned cursors will be re-walked on the next tick.'
            );
          }

          // Persist whatever progress each surface made. Even with a
          // failure on one or two sides, the successful side(s)' new
          // cursors land, so an extended outage on one surface doesn't
          // force a tenant-wide re-walk of the others on recovery.
          if (casesError != null || activityError != null || attachmentsError != null) {
            // Surface the failure via Task Manager's `taskRunError` so
            // task metrics reflect the per-tick outcome. Return rather
            // than throw so the successful surfaces' new cursors still
            // persist; throwing would discard `nextState` and force the
            // next tick to re-walk the surfaces that just succeeded.
            const composite = composeReconciliationError({
              cases: casesError,
              activity: activityError,
              attachments: attachmentsError,
            });
            return {
              state: nextState,
              taskRunError: createTaskRunError(composite, TaskErrorSource.FRAMEWORK),
            };
          }

          return { state: nextState };
        },
        cancel: async () => {
          // Nothing to release here beyond the abort signal Task Manager
          // already trips: the runners are SO walks plus writer
          // dispatches with no long-lived resources. The signal (checked
          // between surfaces and at each runner's page boundary) stops
          // the next page fetch; in-flight writer dispatches finish on
          // their own retry budget.
        },
      }),
    },
  });
}

interface ScheduleReconciliationTaskArgs {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  /**
   * Reconciliation cadence in minutes. Sourced from
   * `xpack.cases.analyticsV2.reconciliationIntervalMinutes` and validated
   * by the config schema (`min: 5`, `defaultValue: 30`). Threaded all the
   * way through from the v2 service so the schedule honours per-tenant
   * tuning instead of a hard-coded default.
   */
  intervalMinutes: number;
}

/**
 * Ensures the singleton reconciliation task instance exists on the cluster
 * AND that its schedule matches the currently-configured interval.
 * Idempotent — safe to call on every node start; Task Manager dedupes by id.
 *
 * Two steps because `ensureScheduled` is a no-op when the task SO already
 * exists: an administrator who changes
 * `xpack.cases.analyticsV2.reconciliationIntervalMinutes` and restarts
 * Kibana would otherwise see no effect from their config change (the
 * pre-existing task keeps firing at the old interval). `bulkUpdateSchedules`
 * reconciles the persisted task's schedule with the configured value;
 * Task Manager's implementation skips the write when the schedule is
 * already equal, so the happy-path cost is one no-op call.
 */
export async function scheduleReconciliationTask({
  taskManager,
  logger,
  intervalMinutes,
}: ScheduleReconciliationTaskArgs): Promise<void> {
  // Task Manager parses the "Nm" form as "every N minutes". The number
  // is config-validated upstream (see `xpack.cases.analyticsV2.reconciliationIntervalMinutes`).
  const interval = `${intervalMinutes}m`;
  try {
    await taskManager.ensureScheduled({
      id: RECONCILIATION_TASK_ID,
      taskType: RECONCILIATION_TASK_TYPE,
      params: {},
      schedule: { interval },
      state: {},
    });
  } catch (err) {
    // Don't propagate — analytics is a downstream feature; failure to
    // schedule reconciliation must not break plugin start.
    logger.error(
      `cases-analyticsV2: failed to schedule reconciliation task: ${
        err instanceof Error ? err.message : String(err)
      }`,
      { error: err }
    );
    return;
  }

  // Reconcile the persisted task's schedule with the configured interval
  // in case it already existed at a different value. `bulkUpdateSchedules`
  // is internally `task.schedule != configured` gated, so the happy path
  // is a single SO read with no write.
  try {
    await taskManager.bulkUpdateSchedules([RECONCILIATION_TASK_ID], { interval });
  } catch (err) {
    logger.warn(
      `cases-analyticsV2: failed to align reconciliation task schedule to interval=${interval}: ${
        err instanceof Error ? err.message : String(err)
      }. The previously-scheduled task will continue firing at its old interval until the next successful schedule alignment or a /reset.`
    );
  }
}

interface ResetReconciliationTaskArgs extends ScheduleReconciliationTaskArgs {
  /**
   * State to force the persisted task SO to after the reset. Carries the
   * cursor seeded from a successful walk so future periodic ticks walk
   * only the post-walk delta instead of re-emitting every case every
   * interval. Empty (default `{}`) makes the next tick a full backfill,
   * which is rarely what you want — a tenant-wide walk on every periodic
   * tick is expensive.
   */
  initialState?: Record<string, unknown>;
}

/**
 * Resets the reconciliation task's persisted state.
 *
 * Two steps, both required:
 *   1. `scheduleReconciliationTask` (ensure-scheduled). No-op when the
 *      task already exists; creates it with the configured interval
 *      otherwise. Guarantees a task SO is on disk for step 2 to update.
 *   2. `bulkUpdateState`. Atomically rewrites the persisted state to
 *      `initialState`. Preferred over a `remove` + `ensureScheduled`
 *      sequence because:
 *        - it doesn't depend on the remove succeeding (a transient
 *          cluster error during remove would leave the SO alive with
 *          stale state, and `ensureScheduled` would no-op);
 *        - it doesn't race a freshly-scheduled task SO against an
 *          in-flight tick about to write its old state back to the same
 *          id.
 *
 * Race with an in-flight tick: `bulkUpdateState` reads and writes the
 * SO non-atomically, so a tick that completes between this read and
 * write (or starts mid-update) can clobber the persisted cursor. The
 * data effect is benign because the reset's synchronous walk has
 * already repopulated `.cases` from the SO source of truth — at worst,
 * the next periodic tick walks a slightly wider window than necessary,
 * and `writer.upsertCase` is idempotent on `_id`.
 */
export async function resetReconciliationTask({
  taskManager,
  logger,
  intervalMinutes,
  initialState = {},
}: ResetReconciliationTaskArgs): Promise<void> {
  // Keep both steps inside the try as a self-contained "never throws" guard. Today
  // `scheduleReconciliationTask` already swallows its own errors, so in practice this catch only
  // fires on the `bulkUpdateState` path — scoping the schedule call in too is defensive
  // future-proofing so a later change that lets it throw can't break this contract.
  try {
    await scheduleReconciliationTask({ taskManager, logger, intervalMinutes });
    await taskManager.bulkUpdateState([RECONCILIATION_TASK_ID], () => initialState);
  } catch (err) {
    logger.warn(
      `cases-analyticsV2: failed to reset reconciliation task state: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

/**
 * Guards against a persisted cursor that points later than the current
 * wall clock — possible from clock skew between Kibana nodes or manual
 * SO edits. Without the clamp, incremental reconciliation freezes until
 * wall time catches up.
 *
 * Returns the original cursor when valid, otherwise `undefined` so the
 * next tick walks every case as a backfill (slower than incremental but
 * correct).
 *
 * Exported for tests.
 */
/**
 * Builds a composite Error message from a per-surface failure map for
 * the reconciliation tick. Surfaces with a `null` / `undefined` error
 * are skipped; the remaining surfaces are joined with ` AND ` so the
 * resulting message reads naturally regardless of how many surfaces
 * failed (one, two, or all three).
 *
 * Returned as an `Error` so the caller can hand it directly to
 * `createTaskRunError` for `taskRunError` reporting (see §1.10 in the
 * follow-up PR plan / README).
 */
function composeReconciliationError(errors: {
  cases?: unknown;
  activity?: unknown;
  attachments?: unknown;
}): Error {
  const failing: string[] = [];
  if (errors.cases != null) failing.push(`cases (${asMessage(errors.cases)})`);
  if (errors.activity != null) failing.push(`activity (${asMessage(errors.activity)})`);
  if (errors.attachments != null) failing.push(`attachments (${asMessage(errors.attachments)})`);
  return new Error(`${failing.join(' AND ')} reconciliation failed`);
}

function asMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function clampCursorToNotFuture(
  lastRunAt: string | undefined,
  logger: Logger
): string | undefined {
  if (lastRunAt == null) return undefined;
  const cursorMs = Date.parse(lastRunAt);
  if (Number.isNaN(cursorMs)) {
    logger.warn(
      `cases-analyticsV2: persisted reconciliation cursor is unparseable (${lastRunAt}); treating as a fresh backfill`
    );
    return undefined;
  }
  if (cursorMs > Date.now()) {
    logger.warn(
      `cases-analyticsV2: persisted reconciliation cursor is in the future (${lastRunAt}); treating as a fresh backfill to avoid silently skipping recent updates`
    );
    return undefined;
  }
  return lastRunAt;
}
