/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Per-task execution accounting for Task Manager.
 *
 * A standalone observer that registers a single process-global `async_hooks`
 * hook and attributes each async resource to the task run that created it, using
 * the execution context the task runner already sets
 * (`{ type: 'task manager', description: 'run task', id: <task id> }`). Because
 * the event loop runs callbacks serially, timing each callback's before -> after
 * and summing per task yields on-CPU ("active") time that no concurrent task can
 * inflate. "Idle" time (holding a worker slot while off-CPU) is then
 * `wall - active`.
 *
 * The measurement does not modify the task-running loop; it only reads the
 * context. See task-manager-per-task-accounting POC for the full design and the
 * (documented) limitations, in particular:
 *  - Per-task memory is reported as `max_memory_per_callback_bytes`: the largest
 *    `heapUsed` growth within a single callback. It is measured strictly
 *    inside the run's own callbacks, so it is isolated from concurrent tasks; it
 *    counts allocation (not retained heap) and excludes off-heap/native memory.
 *  - Purely synchronous CPU bursts that never `await` are not attributed (there
 *    is no async callback boundary to time); cooperative work that yields is.
 */

import type { AsyncHook } from 'node:async_hooks';
import { createHook } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';
import { getHeapStatistics } from 'node:v8';
import type { ExecutionContextStart, Logger } from '@kbn/core/server';
import type { ActivityTrackingConfig } from '../config';
import { ActivityTrackingMode } from '../config';
import type { TaskActivityRunFields } from './types';

/** The `type` the task runner's execution context is always tagged with. */
const TASK_MANAGER_CONTEXT_TYPE = 'task manager';
/** The `description` the task runner sets — distinguishes a *run* from task-store ops. */
const TASK_RUN_CONTEXT_DESCRIPTION = 'run task';
/** The task runner sets `name: 'run <taskType>'`. */
const TASK_RUN_NAME_PREFIX = 'run ';

/** Completed entries whose async resources never emitted `destroy` are swept after this long. */
const COMPLETED_ENTRY_TTL_MS = 5 * 60 * 1000;

interface Activity {
  readonly taskId: string;
  readonly taskType: string;
  /** `false` for sampled-out runs: only `live` is maintained (for cleanup), no accounting. */
  readonly tracked: boolean;
  /** `Date.now()` at first sighting of the run. */
  readonly startedAtMs: number;
  /** Summed on-CPU time (ms) across the run's async callbacks. */
  active: number;
  /** Outstanding (init'd but not destroyed) async resources owned by the run. */
  live: number;
  /** Number of async callbacks executed for the run. */
  callbacks: number;
  /** `performance.now()` of the last callback boundary (before/after). */
  lastBoundaryAt: number;
  /** Longest stretch (ms) between consecutive callbacks while in-flight. */
  longestIdleGap: number;
  /** Longest single callback duration (ms): the longest the run blocked the event loop. */
  longestBlock: number;
  /** `performance.now()` captured at the current callback's `before`; `-1` when none is active. */
  cbStart: number;
  /** `heapUsed` captured at the current callback's `before`; `-1` when none is active. */
  cbHeapStart: number;
  /** Largest positive `heapUsed` growth within a single callback (bytes). */
  maxMemoryPerCallback: number;
  /** Set once the run completes (snapshot taken); the sampler ignores completed runs. */
  completed: boolean;
  /** `Date.now()` when marked completed (for the stale-entry sweep). */
  completedAtMs: number;
  /** Whether a dead-task warning has already been emitted for this run. */
  deadWarned: boolean;
  /** `active` observed at the previous sampler tick (to detect "no growth"). */
  lastSampledActive: number;
}

export interface TaskActivityTrackerOpts {
  executionContext: Pick<ExecutionContextStart, 'get'>;
  logger: Logger;
  config: ActivityTrackingConfig;
}

export class TaskActivityTracker {
  private readonly executionContext: Pick<ExecutionContextStart, 'get'>;
  private readonly logger: Logger;
  private readonly config: ActivityTrackingConfig;
  /** `null` means "all task types"; otherwise only these types are tracked. */
  private readonly allowedTypes: Set<string> | null;

  private readonly perTask = new Map<string, Activity>();
  private readonly owner = new Map<number, string>();

  private hook?: AsyncHook;
  private sampler?: ReturnType<typeof setInterval>;
  private enabled = false;
  /** Errors swallowed inside hook callbacks (hooks must never throw); reported by the sampler. */
  private hookErrors = 0;

  constructor({ executionContext, logger, config }: TaskActivityTrackerOpts) {
    this.executionContext = executionContext;
    this.logger = logger.get('activity-tracking');
    this.config = config;
    this.allowedTypes = config.task_types.length > 0 ? new Set(config.task_types) : null;
  }

  public get isEnabled(): boolean {
    return this.enabled;
  }

  /** Registers the global async hook and starts the in-flight dead-task sampler. */
  public enable(): void {
    if (this.enabled) return;
    if (!this.config.enabled || this.config.mode === ActivityTrackingMode.Off) return;

    if (this.config.mode === ActivityTrackingMode.Benchmark && !hasForcedGc()) {
      this.logger.warn(
        'mode is "benchmark" but Node was not started with --expose-gc; runs will not force GC, ' +
          'so the per-callback memory figure may be influenced by background garbage collection.'
      );
    }

    this.enabled = true;
    this.hook = createHook({
      init: this.onInit,
      before: this.onBefore,
      after: this.onAfter,
      destroy: this.onDestroy,
    });
    this.hook.enable();

    this.sampler = setInterval(this.onSamplerTick, this.config.sampler_interval);
    // never keep the process alive just to sample.
    this.sampler.unref?.();

    this.logger.info(`Enabled (mode=${this.config.mode}).`);
  }

  /** Disables the hook, stops the sampler, and drops all in-memory state. */
  public stop(): void {
    if (!this.enabled) return;
    this.enabled = false;
    this.hook?.disable();
    this.hook = undefined;
    if (this.sampler) clearInterval(this.sampler);
    this.sampler = undefined;
    this.perTask.clear();
    this.owner.clear();
  }

  /**
   * Returns the per-run fields to merge into the event-log document, computed
   * against the authoritative `wallMs` from the task's `TaskTiming`. Marks the
   * run completed. Returns `undefined` when the run was not tracked.
   */
  public getRunFields(taskId: string, wallMs: number): TaskActivityRunFields | undefined {
    const activity = this.perTask.get(taskId);
    if (!activity || !activity.tracked) return undefined;

    activity.completed = true;
    activity.completedAtMs = Date.now();

    const activeMs = Math.round(activity.active);
    const idleMs = Math.max(0, Math.round(wallMs - activity.active));
    const activeRatio = wallMs > 0 ? clamp(activity.active / wallMs, 0, 1) : 0;

    return {
      active_ms: activeMs,
      idle_ms: idleMs,
      active_ratio: roundTo(activeRatio, 4),
      longest_idle_gap_ms: Math.round(activity.longestIdleGap),
      longest_event_loop_block_ms: Math.round(activity.longestBlock),
      callbacks: activity.callbacks,
      max_memory_per_callback_bytes: activity.maxMemoryPerCallback,
    };
  }

  private newActivity(taskId: string, taskType: string): Activity {
    const tracked =
      this.config.mode !== ActivityTrackingMode.Sampled || Math.random() < this.config.sample_rate;

    // In benchmark mode, collect garbage before the run so a GC that would have run
    // during this task's early callbacks is less likely to mask its heap growth.
    if (tracked && this.config.mode === ActivityTrackingMode.Benchmark) forceGc();

    return {
      taskId,
      taskType,
      tracked,
      startedAtMs: Date.now(),
      active: 0,
      live: 0,
      callbacks: 0,
      lastBoundaryAt: performance.now(),
      longestIdleGap: 0,
      longestBlock: 0,
      cbStart: -1,
      cbHeapStart: -1,
      maxMemoryPerCallback: 0,
      completed: false,
      completedAtMs: 0,
      deadWarned: false,
      lastSampledActive: 0,
    };
  }

  // -- async hook callbacks (must be strictly synchronous and must never throw) --

  private readonly onInit = (asyncId: number): void => {
    if (!this.enabled) return;
    try {
      const container = this.executionContext.get();
      if (!container) return;
      const ctx = container.toJSON();
      // task-store ops are also tagged `type: 'task manager'`; only genuine runs
      // set `description: 'run task'`, so use that to avoid mis-attribution.
      if (
        ctx.type !== TASK_MANAGER_CONTEXT_TYPE ||
        ctx.description !== TASK_RUN_CONTEXT_DESCRIPTION ||
        !ctx.id
      ) {
        return;
      }

      const taskId = ctx.id;
      let activity = this.perTask.get(taskId);

      // recurring tasks reuse the id; if the previous run already completed, this
      // is a new run — start fresh.
      if (activity && activity.completed) {
        this.perTask.delete(taskId);
        activity = undefined;
      }

      if (!activity) {
        const taskType =
          ctx.name && ctx.name.startsWith(TASK_RUN_NAME_PREFIX)
            ? ctx.name.slice(TASK_RUN_NAME_PREFIX.length)
            : ctx.name ?? 'unknown';
        if (this.allowedTypes && !this.allowedTypes.has(taskType)) return;
        activity = this.newActivity(taskId, taskType);
        this.perTask.set(taskId, activity);
      }

      this.owner.set(asyncId, taskId);
      activity.live++;
    } catch (e) {
      this.hookErrors++;
    }
  };

  private readonly onBefore = (asyncId: number): void => {
    if (!this.enabled) return;
    try {
      const taskId = this.owner.get(asyncId);
      if (!taskId) return;
      const activity = this.perTask.get(taskId);
      if (!activity || !activity.tracked) return;

      const now = performance.now();
      const gap = now - activity.lastBoundaryAt;
      if (gap > activity.longestIdleGap) activity.longestIdleGap = gap;
      activity.cbStart = now;
      // Capture heap at the callback boundary so `after` can measure the growth
      // that happened while this task's code ran on-CPU (see onAfter).
      activity.cbHeapStart = readHeapUsed();
    } catch (e) {
      this.hookErrors++;
    }
  };

  private readonly onAfter = (asyncId: number): void => {
    if (!this.enabled) return;
    try {
      const taskId = this.owner.get(asyncId);
      if (!taskId) return;
      const activity = this.perTask.get(taskId);
      if (!activity || !activity.tracked || activity.cbStart < 0) return;

      const now = performance.now();
      const cbDuration = now - activity.cbStart;
      activity.active += cbDuration;
      // The longest single callback = the longest the task blocked the event loop.
      if (cbDuration > activity.longestBlock) activity.longestBlock = cbDuration;
      activity.callbacks++;
      activity.lastBoundaryAt = now;
      activity.cbStart = -1;

      // Heap growth strictly within this callback. Because callbacks run serially,
      // this is memory the task allocated while on-CPU — concurrent tasks allocate
      // inside their own callbacks and cannot inflate it. We keep the largest such
      // growth across the run (the max per callback). This is allocation, not retained
      // heap; a GC during the callback can make the delta negative, in which case
      // that callback's growth is unobservable (ignored).
      if (activity.cbHeapStart >= 0) {
        const growth = readHeapUsed() - activity.cbHeapStart;
        activity.cbHeapStart = -1;
        if (growth > activity.maxMemoryPerCallback) activity.maxMemoryPerCallback = growth;
      }
    } catch (e) {
      this.hookErrors++;
    }
  };

  private readonly onDestroy = (asyncId: number): void => {
    if (!this.enabled) return;
    try {
      const taskId = this.owner.get(asyncId);
      if (!taskId) return;
      this.owner.delete(asyncId);
      const activity = this.perTask.get(taskId);
      if (!activity) return;
      activity.live--;
      // once every resource is destroyed and the run is done, drop the entry.
      // (if it hasn't completed yet, keep it — resources come and go during a run.)
      if (activity.live <= 0 && activity.completed) {
        this.perTask.delete(taskId);
      }
    } catch (e) {
      this.hookErrors++;
    }
  };

  // -- in-flight sampler: warns about tasks holding a slot while doing ~0 work --

  private readonly onSamplerTick = (): void => {
    try {
      if (this.hookErrors > 0) {
        this.logger.warn(`Swallowed ${this.hookErrors} async-hook error(s) since the last tick.`);
        this.hookErrors = 0;
      }

      const now = Date.now();

      for (const [taskId, activity] of this.perTask) {
        if (activity.completed) {
          if (now - activity.completedAtMs > COMPLETED_ENTRY_TTL_MS) this.perTask.delete(taskId);
          continue;
        }
        if (!activity.tracked || activity.live <= 0) continue;

        const heldMs = now - activity.startedAtMs;
        const grew = activity.active > activity.lastSampledActive;
        activity.lastSampledActive = activity.active;

        if (!grew && heldMs >= this.config.dead_task_threshold && !activity.deadWarned) {
          const activeRatio = heldMs > 0 ? activity.active / heldMs : 0;
          this.logger.warn(
            `Task "${taskId}" (${activity.taskType}) appears stuck: holding a worker slot for ` +
              `${Math.round(heldMs)}ms with only ${activity.active.toFixed(1)}ms on-CPU ` +
              `(active ratio ~${activeRatio.toFixed(3)}), ${activity.callbacks} callbacks, ` +
              `longest idle gap ${Math.round(activity.longestIdleGap)}ms.`
          );
          activity.deadWarned = true;
        }
      }
    } catch (e) {
      this.logger.warn(`Sampler tick failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
}

// -- process-global accessor used by the task runner to enrich the event log --

let activeTracker: TaskActivityTracker | undefined;

/** Registers (or clears) the process-wide tracker used for event-log enrichment. */
export const setActiveTaskActivityTracker = (tracker: TaskActivityTracker | undefined): void => {
  activeTracker = tracker;
};

/**
 * Returns the per-run event-log fields for a task, or `undefined` when tracking
 * is disabled or the run was not tracked. Safe to call unconditionally.
 */
export const getTaskActivityRunFields = (
  taskId: string,
  wallMs: number
): TaskActivityRunFields | undefined => activeTracker?.getRunFields(taskId, wallMs);

/**
 * Reads the V8 isolate's live heap size (equivalent to `process.memoryUsage().heapUsed`
 * but without the extra `rss` syscall, so it is cheaper to call per callback). Safe to
 * call from async-hook callbacks: it is synchronous and creates no async resource.
 */
const readHeapUsed = (): number => getHeapStatistics().used_heap_size;

const forceGc = (): void => {
  const globalWithGc: { gc?: () => void } = globalThis;
  globalWithGc.gc?.();
};

const hasForcedGc = (): boolean => {
  const globalWithGc: { gc?: () => void } = globalThis;
  return typeof globalWithGc.gc === 'function';
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const roundTo = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
