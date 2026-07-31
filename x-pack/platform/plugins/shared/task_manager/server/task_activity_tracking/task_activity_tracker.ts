/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Per-task execution accounting for Task Manager.
 *
 * A standalone observer that registers a single process-global `async_hooks` hook and
 * attributes each async resource to the task run that created it, using the execution
 * context the task runner already sets (`{ type: 'task manager', description: 'run
 * task', id: <task id> }`). Because the event loop runs callbacks serially, timing a
 * run's callbacks and summing them yields on-CPU ("active") time that no concurrent
 * task can inflate. "Idle" time (holding a worker slot while off-CPU) is `wall - active`.
 *
 * `before`/`after` pairs nest: a callback can run another async resource's callback
 * inside its own (Node's stream and http internals do this routinely). Timing must
 * therefore track a stack of open callbacks and only bill the outermost one belonging
 * to a run — billing nested ones too would double count, and keeping a single "current
 * callback" per run would drop the outer callback entirely and hide the very blocking
 * this module exists to find.
 *
 * Known limitations, in particular:
 *  - Work that runs before `run()` yields for the first time executes in the caller's
 *    callback, not the run's, so the runner measures it at the call site and reports it
 *    via `runSyncSection` (surfaced as `sync_ms`).
 *  - `max_heap_growth_per_callback_bytes` is an optional allocation heuristic. Garbage
 *    collection can hide growth, and V8 heap statistics exclude native and Buffer
 *    memory, so it must not be interpreted as retained or total task memory.
 *  - Blocking that still escapes attribution shows up as `unattributed_block_ms`, the
 *    gap between the run's longest attributed block and the process-wide event-loop
 *    delay maximum the runner already measures.
 *  - Process-wide CPU time provides a second upper bound. CPU used by concurrent tasks
 *    or worker threads appears in `unattributed_cpu_ms`, so it is diagnostic rather than
 *    attributable.
 */

import type { AsyncHook } from 'node:async_hooks';
import { createHook } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';
import { getHeapStatistics } from 'node:v8';
import type { ExecutionContextStart, Logger } from '@kbn/core/server';
import type { ActivityTrackingConfig } from '../config';
import type { TaskActivityRunFields } from './types';

/** The `type` the task runner's execution context is always tagged with. */
const TASK_MANAGER_CONTEXT_TYPE = 'task manager';
/** The `description` the task runner sets — distinguishes a *run* from task-store ops. */
const TASK_RUN_CONTEXT_DESCRIPTION = 'run task';

/** Completed runs whose async resources never emitted `destroy` are swept after this long. */
const COMPLETED_ENTRY_TTL_MS = 5 * 60 * 1000;

/**
 * Above this fraction of on-CPU time process-wide, an in-flight task showing no activity
 * cannot be assumed idle: the process is busy and the work may simply be unattributed.
 */
const BUSY_PROCESS_CPU_RATIO = 0.9;
const SAMPLER_INTERVAL_MS = 30 * 1000;
const DEAD_TASK_THRESHOLD_MS = 60 * 1000;

interface RunActivity {
  /** Monotonic per-run token. Recurring tasks reuse ids, runs do not share a token. */
  readonly token: number;
  readonly taskId: string;
  readonly taskType: string;
  /** `Date.now()` when the runner announced the run. */
  readonly startedAtMs: number;
  /** Process CPU counters when the runner announced the run. */
  readonly cpuUsageAtStart: NodeJS.CpuUsage;
  /** Summed on-CPU time (ms): the run's outermost callbacks plus `syncMs`. */
  active: number;
  /** On-CPU time (ms) measured at the call site, before `run()` first yielded. */
  syncMs: number;
  /** Outstanding (init'd but not destroyed) async resources owned by the run. */
  live: number;
  /** Async ids owned by this run, used for bounded cleanup when the run is retired. */
  readonly ownedAsyncIds: Set<number>;
  /** Number of outermost callbacks executed for the run. */
  callbacks: number;
  /** `performance.now()` of the last callback boundary. */
  lastBoundaryAt: number;
  /** Longest stretch (ms) between consecutive callbacks while in-flight. */
  longestIdleGap: number;
  /** Longest single uninterrupted on-CPU stretch (ms) attributed to the run. */
  longestBlock: number;
  /** Largest positive V8 heap growth within a single callback (bytes). */
  maxHeapGrowthPerCallback: number;
  /** Set once the run reports (or is retired); its callbacks are no longer billed. */
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
  /** Shorter timings used by unit tests; production always uses the defaults. */
  timing?: {
    samplerIntervalMs?: number;
    deadTaskThresholdMs?: number;
  };
}

export class TaskActivityTracker {
  private readonly executionContext: Pick<ExecutionContextStart, 'get'>;
  private readonly logger: Logger;
  private readonly config: ActivityTrackingConfig;
  private readonly trackHeapGrowth: boolean;
  private readonly samplerIntervalMs: number;
  private readonly deadTaskThresholdMs: number;

  private readonly runs = new Map<number, RunActivity>();
  private readonly runByTaskId = new Map<string, number>();
  private readonly owner = new Map<number, number>();
  private runSeq = 0;

  /*
   * Stack of open callbacks. Only run-owned callbacks are pushed, so the depth stays at
   * the nesting depth of a single task's callbacks (a handful) and unrelated callbacks
   * cost nothing beyond one map lookup.
   */
  private depth = 0;
  private readonly frameAsyncId: number[] = [];
  private readonly frameToken: number[] = [];
  private readonly frameStart: number[] = [];
  private readonly frameHeapStart: number[] = [];
  private readonly frameCounted: boolean[] = [];
  private countedFrames = 0;
  /** The call-site timer owns all work while this is non-zero. */
  private syncSectionDepth = 0;

  private hook?: AsyncHook;
  private hookEnabled = false;
  private sampler?: ReturnType<typeof setInterval>;
  private enabled = false;
  /** Errors swallowed inside hook callbacks (hooks must never throw); reported by the sampler. */
  private hookErrors = 0;
  private lastCpuUsage = process.cpuUsage();
  private lastSamplerTickAt = performance.now();

  constructor({ executionContext, logger, config, timing }: TaskActivityTrackerOpts) {
    this.executionContext = executionContext;
    this.logger = logger.get('activity-tracking');
    this.config = config;
    this.trackHeapGrowth = config.track_heap_growth;
    this.samplerIntervalMs = timing?.samplerIntervalMs ?? SAMPLER_INTERVAL_MS;
    this.deadTaskThresholdMs = timing?.deadTaskThresholdMs ?? DEAD_TASK_THRESHOLD_MS;
  }

  public get isEnabled(): boolean {
    return this.enabled;
  }

  /** Registers the global async hook and starts the in-flight dead-task sampler. */
  public enable(): void {
    if (this.enabled) return;
    if (!this.config.enabled) return;

    this.enabled = true;
    this.hook = createHook({
      init: this.onInit,
      before: this.onBefore,
      after: this.onAfter,
      destroy: this.onDestroy,
    });

    this.enableHook();

    this.sampler = setInterval(this.onSamplerTick, this.samplerIntervalMs);
    // never keep the process alive just to sample.
    this.sampler.unref?.();

    this.logger.info(`Enabled (track_heap_growth=${this.trackHeapGrowth}).`);
  }

  /** Disables the hook, stops the sampler, and drops all in-memory state. */
  public stop(): void {
    if (!this.enabled) return;
    this.enabled = false;
    this.disableHook();
    this.hook = undefined;
    if (this.sampler) clearInterval(this.sampler);
    this.sampler = undefined;
    this.runs.clear();
    this.runByTaskId.clear();
    this.owner.clear();
  }

  /**
   * Announces a run. Accounting state is created here rather than lazily from the hook,
   * so a run gets its own token: late callbacks from a previous run of the same
   * (recurring) task id cannot land on it.
   */
  public beginRun(taskId: string, taskType: string): void {
    if (!this.enabled) return;

    const previous = this.currentRun(taskId);
    if (previous && !previous.completed) {
      // the previous run never reported (cancelled, or the process was mid-run when
      // tracking started); retire it so it stops accumulating.
      previous.completed = true;
      previous.completedAtMs = Date.now();
      if (previous.live <= 0) this.dropRun(previous);
    }

    const token = ++this.runSeq;
    this.runs.set(token, {
      token,
      taskId,
      taskType,
      startedAtMs: Date.now(),
      cpuUsageAtStart: process.cpuUsage(),
      active: 0,
      syncMs: 0,
      live: 0,
      ownedAsyncIds: new Set(),
      callbacks: 0,
      lastBoundaryAt: performance.now(),
      longestIdleGap: 0,
      longestBlock: 0,
      maxHeapGrowthPerCallback: 0,
      completed: false,
      completedAtMs: 0,
      deadWarned: false,
      lastSampledActive: 0,
    });
    this.runByTaskId.set(taskId, token);
  }

  /**
   * Runs the call to `task.run()` and measures everything it does before returning its
   * promise. If the call already sits inside a callback owned by this tracker, that
   * callback accounts for the time; otherwise this section accounts for it and suppresses
   * nested hook callbacks so the same work cannot be billed twice.
   */
  public runSyncSection<T>(taskId: string, fn: () => T): T {
    const run = this.currentRun(taskId);
    if (!this.enabled || !this.hookEnabled || !run || run.completed) return fn();

    const shouldBill = !this.hasOpenCountedFrame() && this.syncSectionDepth === 0;
    const heapStart = shouldBill && this.trackHeapGrowth ? readHeapUsed() : -1;
    const startedAt = performance.now();
    if (shouldBill) this.syncSectionDepth++;

    try {
      return fn();
    } finally {
      const endedAt = performance.now();
      const duration = endedAt - startedAt;
      run.syncMs += duration;

      if (shouldBill) {
        this.syncSectionDepth--;
        run.active += duration;
        if (duration > run.longestBlock) run.longestBlock = duration;
        run.lastBoundaryAt = endedAt;
        this.recordHeapGrowth(run, heapStart);
      }
    }
  }

  /**
   * Returns the per-run fields to merge into the event-log document, computed against
   * the authoritative `wallMs` and event-loop-delay maximum from the task's
   * `TaskTiming`. Marks the run completed. Returns `undefined` when tracking is disabled
   * or the run was not announced.
   */
  public getRunFields(
    taskId: string,
    wallMs: number,
    eventLoopDelayMaxMs: number = 0
  ): TaskActivityRunFields | undefined {
    const run = this.currentRun(taskId);
    if (!run || run.completed) return undefined;

    run.completed = true;
    run.completedAtMs = Date.now();

    const activeMs = Math.round(run.active);
    const longestBlockMs = Math.round(run.longestBlock);
    const eldMaxMs = Math.round(eventLoopDelayMaxMs);
    const cpuUsage = process.cpuUsage(run.cpuUsageAtStart);
    const processCpuMs = Math.round((cpuUsage.user + cpuUsage.system) / 1000);

    const fields: TaskActivityRunFields = {
      active_ms: activeMs,
      idle_ms: Math.max(0, Math.round(wallMs - run.active)),
      active_ratio: roundTo(wallMs > 0 ? clamp(run.active / wallMs, 0, 1) : 0, 4),
      longest_idle_gap_ms: Math.round(run.longestIdleGap),
      longest_event_loop_block_ms: longestBlockMs,
      callbacks: run.callbacks,
      sync_ms: Math.round(run.syncMs),
      event_loop_delay_max_ms: eldMaxMs,
      unattributed_block_ms: Math.max(0, eldMaxMs - longestBlockMs),
      process_cpu_ms: processCpuMs,
      unattributed_cpu_ms: Math.max(0, processCpuMs - activeMs),
      ...(this.trackHeapGrowth
        ? { max_heap_growth_per_callback_bytes: run.maxHeapGrowthPerCallback }
        : {}),
    };
    if (run.live <= 0) this.dropRun(run);
    return fields;
  }

  private currentRun(taskId: string): RunActivity | undefined {
    const token = this.runByTaskId.get(taskId);
    return token === undefined ? undefined : this.runs.get(token);
  }

  private hasOpenCountedFrame(): boolean {
    return this.countedFrames > 0;
  }

  // -- hook lifecycle --

  private enableHook(): void {
    if (this.hookEnabled) return;
    this.depth = 0;
    this.countedFrames = 0;
    this.lastCpuUsage = process.cpuUsage();
    this.lastSamplerTickAt = performance.now();
    this.hookEnabled = true;
    this.hook?.enable();
  }

  private disableHook(): void {
    if (!this.hookEnabled) return;
    this.hook?.disable();
    this.hookEnabled = false;
    this.depth = 0;
    this.countedFrames = 0;
  }

  // -- async hook callbacks (must be strictly synchronous and must never throw) --

  private readonly onInit = (asyncId: number): void => {
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

      const run = this.currentRun(ctx.id);
      if (!run || run.completed) return;

      this.owner.set(asyncId, run.token);
      run.ownedAsyncIds.add(asyncId);
      run.live++;
    } catch (e) {
      this.hookErrors++;
    }
  };

  private readonly onBefore = (asyncId: number): void => {
    try {
      const token = this.owner.get(asyncId);
      if (token === undefined) return;

      let counted = false;
      let start = -1;
      let heapStart = -1;

      // only the outermost callback of a run is billed: nested callbacks run inside it,
      // so their time is already covered by it.
      if (!this.hasOpenCountedFrame() && this.syncSectionDepth === 0) {
        const run = this.runs.get(token);
        if (run && !run.completed) {
          counted = true;
          if (this.trackHeapGrowth) heapStart = readHeapUsed();
          start = performance.now();
          const gap = start - run.lastBoundaryAt;
          if (gap > run.longestIdleGap) run.longestIdleGap = gap;
        }
      }

      const frame = this.depth;
      this.frameAsyncId[frame] = asyncId;
      this.frameToken[frame] = token;
      this.frameStart[frame] = start;
      this.frameHeapStart[frame] = heapStart;
      this.frameCounted[frame] = counted;
      if (counted) this.countedFrames++;
      this.depth = frame + 1;
    } catch (e) {
      this.hookErrors++;
    }
  };

  private readonly onAfter = (asyncId: number): void => {
    try {
      if (this.depth === 0) return;

      let frame = -1;
      for (let i = this.depth - 1; i >= 0; i--) {
        if (this.frameAsyncId[i] === asyncId) {
          frame = i;
          break;
        }
      }
      if (frame < 0) return;

      const now = performance.now();
      // unwind: an `after` for an outer callback closes anything left open above it.
      for (let i = this.depth - 1; i >= frame; i--) {
        if (this.frameCounted[i]) {
          this.bill(i, now);
          this.countedFrames--;
        }
      }
      this.depth = frame;
    } catch (e) {
      this.hookErrors++;
    }
  };

  private bill(frame: number, now: number): void {
    const run = this.runs.get(this.frameToken[frame]);
    if (!run) return;

    const duration = now - this.frameStart[frame];
    run.active += duration;
    // the longest single callback = the longest the task blocked the event loop.
    if (duration > run.longestBlock) run.longestBlock = duration;
    run.callbacks++;
    run.lastBoundaryAt = now;
    this.recordHeapGrowth(run, this.frameHeapStart[frame]);
  }

  private recordHeapGrowth(run: RunActivity, heapStart: number): void {
    if (heapStart < 0) return;
    const growth = readHeapUsed() - heapStart;
    if (growth > run.maxHeapGrowthPerCallback) run.maxHeapGrowthPerCallback = growth;
  }

  private readonly onDestroy = (asyncId: number): void => {
    try {
      const token = this.owner.get(asyncId);
      if (token === undefined) return;
      this.owner.delete(asyncId);
      const run = this.runs.get(token);
      if (!run) return;
      run.ownedAsyncIds.delete(asyncId);
      run.live--;
      // once every resource is destroyed and the run is done, drop the entry.
      // (if it hasn't completed yet, keep it — resources come and go during a run.)
      if (run.live <= 0 && run.completed) this.dropRun(run);
    } catch (e) {
      this.hookErrors++;
    }
  };

  private dropRun(run: RunActivity): void {
    this.runs.delete(run.token);
    if (this.runByTaskId.get(run.taskId) === run.token) this.runByTaskId.delete(run.taskId);
    for (const asyncId of run.ownedAsyncIds) this.owner.delete(asyncId);
    run.ownedAsyncIds.clear();
  }

  // -- in-flight sampler: warns about tasks holding a slot while doing ~0 work --

  private readonly onSamplerTick = (): void => {
    try {
      if (this.hookErrors > 0) {
        this.logger.warn(`Swallowed ${this.hookErrors} async-hook error(s) since the last tick.`);
        this.hookErrors = 0;
      }

      const now = Date.now();
      const cpuRatio = this.consumeProcessCpuRatio();

      for (const run of [...this.runs.values()]) {
        if (run.completed) {
          if (now - run.completedAtMs > COMPLETED_ENTRY_TTL_MS) this.dropRun(run);
          continue;
        }
        if (run.live <= 0) continue;

        const heldMs = now - run.startedAtMs;
        const grew = run.active > run.lastSampledActive;
        run.lastSampledActive = run.active;

        if (grew || heldMs < this.deadTaskThresholdMs || run.deadWarned) continue;

        const message =
          `Task "${run.taskId}" (${run.taskType}) appears stuck: holding a worker slot for ` +
          `${Math.round(heldMs)}ms with only ${run.active.toFixed(1)}ms on-CPU ` +
          `(active ratio ~${(heldMs > 0 ? run.active / heldMs : 0).toFixed(3)}), ` +
          `${run.callbacks} callbacks, longest idle gap ${Math.round(run.longestIdleGap)}ms.`;

        // A busy process cannot be told apart from a busy-but-unattributed task, so do
        // not claim a task is stuck while the loop is saturated.
        if (cpuRatio >= BUSY_PROCESS_CPU_RATIO) {
          this.logger.debug(
            `${message} Not reported as stuck: the process was ${(cpuRatio * 100).toFixed(
              0
            )}% on-CPU, so this may be unattributed work.`
          );
          continue;
        }

        this.logger.warn(message);
        run.deadWarned = true;
      }
    } catch (e) {
      this.logger.warn(`Sampler tick failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  /** Fraction of wall time the whole process spent on-CPU since the previous tick. */
  private consumeProcessCpuRatio(): number {
    const usage = process.cpuUsage(this.lastCpuUsage);
    const now = performance.now();
    const elapsedMs = now - this.lastSamplerTickAt;
    this.lastCpuUsage = process.cpuUsage();
    this.lastSamplerTickAt = now;
    if (elapsedMs <= 0) return 0;
    return (usage.user + usage.system) / 1000 / elapsedMs;
  }
}

// -- process-global accessors used by the task runner --

let activeTracker: TaskActivityTracker | undefined;

/** Registers (or clears) the process-wide tracker used for event-log enrichment. */
export const setActiveTaskActivityTracker = (tracker: TaskActivityTracker | undefined): void => {
  activeTracker = tracker;
};

/** Announces a task run to the tracker. Safe to call unconditionally. */
export const beginTaskActivityRun = (taskId: string, taskType: string): void =>
  activeTracker?.beginRun(taskId, taskType);

/**
 * Invokes `fn` while measuring the synchronous prefix of a task run. Safe to call
 * unconditionally.
 */
export const runTaskWithActivityTracking = <T>(taskId: string, fn: () => T): T =>
  activeTracker ? activeTracker.runSyncSection(taskId, fn) : fn();

/**
 * Returns the per-run event-log fields for a task, or `undefined` when tracking is
 * disabled or the run was not announced. Safe to call unconditionally.
 */
export const getTaskActivityRunFields = (
  taskId: string,
  wallMs: number,
  eventLoopDelayMaxMs?: number
): TaskActivityRunFields | undefined =>
  activeTracker?.getRunFields(taskId, wallMs, eventLoopDelayMaxMs);

/** Reads only the V8 heap, avoiding the additional RSS work in `process.memoryUsage()`. */
const readHeapUsed = (): number => getHeapStatistics().used_heap_size;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const roundTo = (value: number, digits: number): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};
