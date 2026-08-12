/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { TaskCost, TaskPriority } from '@kbn/task-manager-plugin/server';
import type { ReconcilerConfig } from '../config';
import { stateSchemaByVersion, emptyState, type ReconcilerTaskState } from './task_state';
import { buildUbqBody } from './ubq_builder';

export const TASK_TYPE = 'savedObjectsSemanticReconciler:sweep';
export const TASK_ID = 'savedObjectsSemanticReconciler:sweep';

/** Epoch fallback watermark — used on first run before any successful sweep. */
const EPOCH_WATERMARK = '1970-01-01T00:00:00.000Z';

/**
 * Milliseconds to wait between ES task-status polls when waiting for an async UBQ to complete.
 * Long enough to avoid hammering ES but short enough to react promptly on small sweeps.
 */
const POLL_INTERVAL_MS = 2_000;

/**
 * Safety margin subtracted from taskStartTime when computing the new watermark.
 * Covers ES index refresh latency (up to 1 s default) + cross-node clock skew.
 * 60 s is conservative; re-embedding a 60-second overlap window per cycle is idempotent
 * and cheap compared to permanently missing a deferred-mode update.
 */
const WATERMARK_SAFETY_MARGIN_MS = 60_000;

/**
 * Maximum number of cycles to skip when backing off from persistent inference failures.
 * At N consecutive-failure streaks, the type is skipped for min(2^(N-1), MAX_BACKOFF_CYCLES)
 * cycles. Caps at ~1 h at 1 m pollInterval.
 */
const MAX_BACKOFF_CYCLES = 64;

/**
 * ES UBQ response shape — the fields we care about after a completed async task.
 * `failures` is capped at 10 by ES by default; the count reflects that cap.
 */
interface UbqResult {
  total?: number;
  updated?: number;
  version_conflicts?: number;
  failures?: Array<{
    id?: string;
    cause?: { type?: string; reason?: string };
    status?: number;
  }>;
}

/** Polls `GET /_tasks/{taskId}` until `completed: true`, passing signal to every call. */
const pollUntilDone = async (
  esClient: Awaited<
    ReturnType<CoreSetup['getStartServices']>
  >[0]['elasticsearch']['client']['asInternalUser'],
  esTaskId: string,
  signal: AbortSignal,
  pollIntervalMs: number = POLL_INTERVAL_MS
): Promise<{ result: UbqResult; taskError?: string }> => {
  while (true) {
    if (signal.aborted) {
      // Best-effort cancellation of the running ES task so we don't leave orphaned work.
      try {
        await esClient.tasks.cancel({ task_id: esTaskId });
      } catch {
        // ignore — task may have already completed
      }
      return { result: {} };
    }

    await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs));

    const status = await esClient.tasks.get(
      { task_id: esTaskId, wait_for_completion: false },
      { signal }
    );

    if (status.completed) {
      // Surface task-level error (Painless compile error, search_phase_execution_exception, etc.)
      // alongside the per-doc result. status.error is typed as ErrorCause | undefined.
      const taskError = status.error
        ? `${status.error.type ?? 'unknown'}: ${status.error.reason ?? 'no reason'}`
        : undefined;

      // canceled may appear in response body (not in the top-level TypeScript type)
      const rawResponse = status.response as Record<string, unknown> | undefined;
      const canceled = rawResponse?.canceled === true;
      const errorStr = taskError ?? (canceled ? 'task was externally cancelled' : undefined);

      return { result: (status.response ?? {}) as UbqResult, taskError: errorStr };
    }
  }
};

/**
 * Registers the reconciler task with Task Manager.
 * Must be called during the plugin setup phase so the definition is available before tasks fire.
 */
export const registerReconcilerTask = (
  taskManager: TaskManagerSetupContract,
  core: CoreSetup,
  logger: Logger,
  cfg: ReconcilerConfig
): void => {
  taskManager.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Saved Objects Semantic Search Reconciler',
      description:
        'Sweeps for saved-object docs that have absent or stale semantic shadow fields and populates them via scripted update_by_query (backfill + deferred-embedding pickup).',
      timeout: '30m',
      cost: TaskCost.ExtraLarge,
      priority: TaskPriority.Low,
      stateSchemaByVersion,
      createTaskRunner: ({ taskInstance, signal }: RunContext) => ({
        run: async (): Promise<{ state: ReconcilerTaskState }> => {
          const state = (taskInstance.state ?? emptyState) as ReconcilerTaskState;
          return runReconcilerSweep({ core, logger, cfg, state, signal });
        },
      }),
    },
  });
};

/**
 * Schedules the singleton recurring reconciler task if any registered type opts in to
 * semantic search. Called from plugin start (idempotent via ensureScheduled).
 * Also updates the schedule interval on existing tasks when the config changes.
 */
export const ensureReconcilerScheduled = async (
  taskManager: TaskManagerStartContract,
  core: CoreSetup,
  logger: Logger,
  cfg: ReconcilerConfig
): Promise<void> => {
  const [coreStart] = await core.getStartServices();
  const registry = coreStart.savedObjects.getTypeRegistry();
  const optedInTypes = registry
    .getAllTypes()
    .filter((t) => registry.getSemanticSearchDefinition(t.name) !== undefined);

  if (optedInTypes.length === 0) {
    logger.debug(
      '[ReconcilerTask] No types declare semanticSearch — reconciler task will not be scheduled.'
    );
    return;
  }

  try {
    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: { interval: cfg.pollInterval },
      params: {},
      state: emptyState,
    });
    logger.info(
      `[ReconcilerTask] Scheduled with interval=${cfg.pollInterval} for ${optedInTypes.length} opted-in type(s).`
    );

    // Update the interval on the existing task document if the config changed since it was
    // first scheduled — ensureScheduled preserves the existing schedule (idempotent).
    try {
      const existing = await taskManager.get(TASK_ID);
      if (existing?.schedule?.interval !== cfg.pollInterval) {
        await taskManager.bulkUpdateSchedules([TASK_ID], { interval: cfg.pollInterval });
        logger.info(
          `[ReconcilerTask] Updated schedule interval to ${cfg.pollInterval} (was ${existing?.schedule?.interval}).`
        );
      }
    } catch {
      // Non-fatal: the task will run at its existing interval until the next restart.
    }
  } catch (err) {
    logger.error(`[ReconcilerTask] Failed to schedule: ${err.message}`, { error: err });
  }
};

/**
 * Core sweep logic — runs per task invocation.
 * Separated from the runner factory so it can be unit-tested without Task Manager plumbing.
 */
export const runReconcilerSweep = async ({
  core,
  logger,
  cfg,
  state,
  signal,
  pollIntervalMs = POLL_INTERVAL_MS,
}: {
  core: CoreSetup;
  logger: Logger;
  cfg: ReconcilerConfig;
  state: ReconcilerTaskState;
  signal: AbortSignal;
  /** Milliseconds between ES task-status polls. Overridable in tests (set to 0 for instant). */
  pollIntervalMs?: number;
}): Promise<{ state: ReconcilerTaskState }> => {
  const [coreStart] = await core.getStartServices();
  const registry = coreStart.savedObjects.getTypeRegistry();

  // Collect opted-in types at run time — types can register after start.
  const allOptedInTypes = registry
    .getAllTypes()
    .filter((t) => registry.getSemanticSearchDefinition(t.name) !== undefined);

  if (allOptedInTypes.length === 0) {
    // No-op invariant: zero ES calls when nothing opts in.
    return { state };
  }

  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const taskStartTime = new Date().toISOString();

  // Carry forward all state fields, mutating only what changes this sweep.
  const updatedWatermarks = { ...state.watermarks };
  const updatedConsecutiveFailures = { ...state.consecutiveFailures };
  const updatedLastFailureReason = { ...state.lastFailureReason };

  // Rotation cursor: start from where we left off so tail types are not starved.
  const cursor = (state.rotationCursor ?? 0) % allOptedInTypes.length;
  const rotatedTypes = [...allOptedInTypes.slice(cursor), ...allOptedInTypes.slice(0, cursor)];
  // nextCursor advances past each type we fully process.
  let nextCursor = cursor;

  for (const soType of rotatedTypes) {
    if (signal.aborted) break;

    const typeName = soType.name;
    const def = registry.getSemanticSearchDefinition(typeName)!;
    const watermark = updatedWatermarks[typeName] ?? EPOCH_WATERMARK;

    // --- Exponential backoff for persistent inference failures ---
    // consecutiveFailures[typeName] encodes the remaining skip-budget: when > 0, skip this
    // cycle and decrement. When it reaches 0, retry. On each new failure, set budget to
    // min(2^streakCount-1, MAX_BACKOFF_CYCLES) where streakCount is stored in lastFailureReason
    // as a "streak:<count>:<reason>" prefix.
    const skipBudget = updatedConsecutiveFailures[typeName] ?? 0;
    if (skipBudget > 0) {
      logger.debug(
        `[ReconcilerTask] type="${typeName}" skipping this cycle (backoff; skips remaining: ${skipBudget}).`
      );
      updatedConsecutiveFailures[typeName] = skipBudget - 1;
      nextCursor = (allOptedInTypes.indexOf(soType) + cursor + 1) % allOptedInTypes.length;
      continue;
    }

    const targetIndex = coreStart.savedObjects.getIndexForType(typeName);

    logger.debug(
      `[ReconcilerTask] Sweeping type="${typeName}" index="${targetIndex}" watermark="${watermark}"`
    );

    // --- Preflight count: skip UBQ submission if nothing matches ---
    let matchCount = -1; // -1 = unknown (count failed), proceed anyway
    try {
      const countResp = await esClient.count(
        {
          index: targetIndex,
          query: buildUbqBody(typeName, def.fields, watermark).query as Record<string, unknown>,
        },
        { signal }
      );
      matchCount = countResp.count;
    } catch (err) {
      logger.debug(
        `[ReconcilerTask] type="${typeName}" preflight count failed (${err.message}); proceeding with UBQ.`
      );
    }

    if (matchCount === 0) {
      logger.debug(
        `[ReconcilerTask] type="${typeName}" preflight count=0 — no docs need reconciliation; skipping UBQ.`
      );
      // Advance watermark: the sweep is effectively complete for this type.
      const newWatermark = new Date(
        Date.parse(taskStartTime) - WATERMARK_SAFETY_MARGIN_MS
      ).toISOString();
      updatedWatermarks[typeName] = newWatermark;
      nextCursor = (allOptedInTypes.indexOf(soType) + cursor + 1) % allOptedInTypes.length;
      continue;
    }

    const body = buildUbqBody(typeName, def.fields, watermark);

    let esTaskId: string | undefined;
    try {
      const submitResp = await esClient.updateByQuery(
        {
          index: targetIndex,
          conflicts: 'proceed',
          scroll_size: cfg.batchSize,
          max_docs: cfg.maxDocsPerSweep,
          requests_per_second: cfg.requestsPerSecond,
          wait_for_completion: false,
          ...body,
        } as Parameters<typeof esClient.updateByQuery>[0],
        { signal }
      );
      // When wait_for_completion=false, the response contains { task: '<node>:<taskId>' }.
      esTaskId = 'task' in submitResp ? String(submitResp.task) : undefined;
    } catch (err) {
      // A genuine query/mapping error — log and let TM retry/visibility apply.
      logger.warn(
        `[ReconcilerTask] type="${typeName}" UBQ submission failed: ${err.message}. Will retry next cycle.`,
        { error: err }
      );
      continue;
    }

    if (!esTaskId) {
      logger.warn(`[ReconcilerTask] type="${typeName}" UBQ returned no task ID; skipping.`);
      continue;
    }

    let pollResult: { result: UbqResult; taskError?: string };
    try {
      pollResult = await pollUntilDone(esClient, esTaskId, signal, pollIntervalMs);
    } catch (err) {
      // Polling error (network blip, etc.) — doc retry is implicit next cycle.
      logger.warn(
        `[ReconcilerTask] type="${typeName}" UBQ polling failed: ${err.message}. Docs will retry next cycle.`,
        { error: err }
      );
      continue;
    } finally {
      // Best-effort delete the .tasks result document to prevent unbounded .tasks index growth.
      // ES persists task results in .tasks until explicitly deleted; at 1-min poll intervals
      // these accumulate indefinitely (~1440/day/type).
      esClient.delete({ index: '.tasks', id: esTaskId }).catch(() => {});
    }

    if (signal.aborted) break;

    const { result, taskError } = pollResult;

    // Check for task-level error (not per-doc failures) — e.g. Painless compile error,
    // search_phase_execution_exception, external cancellation.
    if (taskError) {
      logger.warn(
        `[ReconcilerTask] type="${typeName}" UBQ task failed: ${taskError}. Watermark NOT advanced; docs will retry next cycle.`
      );
      continue;
    }

    const versionConflicts = result.version_conflicts ?? 0;
    const failures = result.failures ?? [];
    const totalDocs = result.total ?? 0;
    const updatedDocs = result.updated ?? 0;

    if (versionConflicts > 0) {
      logger.debug(
        `[ReconcilerTask] type="${typeName}" ${versionConflicts} version conflict(s) — skipped docs will retry next cycle.`
      );
    }

    if (failures.length > 0) {
      // ES caps failures[] at 10 by default — actual failure count may be higher.
      const sample = failures[0];
      const reason = `${sample?.cause?.type ?? 'unknown'}: ${sample?.cause?.reason ?? 'unknown'}`;

      // Compute exponential backoff skip budget.
      // lastFailureReason encodes "streak:<count>:<reason>" to track the failure streak.
      const prevEncoded = updatedLastFailureReason[typeName];
      let streakCount = 1;
      let prevReason: string | undefined;
      if (prevEncoded?.startsWith('streak:')) {
        const colonIdx = prevEncoded.indexOf(':', 'streak:'.length);
        const countStr = prevEncoded.slice('streak:'.length, colonIdx);
        prevReason = prevEncoded.slice(colonIdx + 1);
        if (prevReason === reason) {
          streakCount = Math.min(parseInt(countStr, 10) + 1, 62);
        }
      }
      const newSkipBudget = Math.min(Math.pow(2, streakCount - 1), MAX_BACKOFF_CYCLES);
      updatedConsecutiveFailures[typeName] = newSkipBudget;
      updatedLastFailureReason[typeName] = `streak:${streakCount}:${reason}`;

      // Warn only on the first occurrence of this reason or when the reason changes,
      // to avoid spamming logs every cycle.
      if (prevReason === undefined || prevReason !== reason || streakCount === 1) {
        logger.warn(
          `[ReconcilerTask] type="${typeName}" ${failures.length} inference failure(s) (ES cap=10; actual count may be higher). ` +
            `Sample: ${reason}. ` +
            `Affected docs will retry next cycle via detection filter. ` +
            `Backing off for ${newSkipBudget} cycle(s).`
        );
      } else {
        logger.debug(
          `[ReconcilerTask] type="${typeName}" inference failures continuing (streak=${streakCount}); backoff=${newSkipBudget} cycles.`
        );
      }
      // Do NOT advance watermark — failed docs remain matchable, retry next cycle.
      continue;
    }

    // Success: reset backoff state.
    updatedConsecutiveFailures[typeName] = 0;
    delete updatedLastFailureReason[typeName];

    const truncated = totalDocs >= cfg.maxDocsPerSweep;
    if (truncated) {
      logger.debug(
        `[ReconcilerTask] type="${typeName}" sweep capped at maxDocsPerSweep=${cfg.maxDocsPerSweep} ` +
          `(total=${totalDocs}, updated=${updatedDocs}). Remaining docs will process next cycle.`
      );
      // Do NOT advance watermark so remaining docs stay in the detection window.
      nextCursor = (allOptedInTypes.indexOf(soType) + cursor + 1) % allOptedInTypes.length;
      continue;
    }

    // Advance watermark with a safety margin to cover refresh latency + clock skew.
    // This ensures deferred-mode docs written just before taskStartTime (and not yet
    // searchable at UBQ snapshot time) are still picked up next cycle.
    const newWatermark = new Date(
      Date.parse(taskStartTime) - WATERMARK_SAFETY_MARGIN_MS
    ).toISOString();
    logger.debug(
      `[ReconcilerTask] type="${typeName}" sweep complete: updated=${updatedDocs}, conflicts=${versionConflicts}. Advancing watermark to ${newWatermark}.`
    );
    updatedWatermarks[typeName] = newWatermark;
    nextCursor = (allOptedInTypes.indexOf(soType) + cursor + 1) % allOptedInTypes.length;
  }

  return {
    state: {
      watermarks: updatedWatermarks,
      consecutiveFailures: updatedConsecutiveFailures,
      lastFailureReason: updatedLastFailureReason,
      rotationCursor: nextCursor,
    },
  };
};
