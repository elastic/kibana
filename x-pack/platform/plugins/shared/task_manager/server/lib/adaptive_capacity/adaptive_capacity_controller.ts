/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHeapStatistics } from 'v8';
import { PerformanceObserver, constants as perfConstants } from 'perf_hooks';
import { BehaviorSubject, type Observable } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { JsonObject } from '@kbn/utility-types';
import { TaskCost } from '../../task';
import type { ClaimMemoryGate } from '../../task_claimers';
import type { RunningTaskSnapshot } from '../../task_pool';
import type { RunMemoryObservation, TaskTypeMemoryEstimate } from './task_memory_estimator';
import { TaskMemoryEstimator } from './task_memory_estimator';

export interface HeapStats {
  readonly usedHeapBytes: number;
  /** Memory V8 tracks outside its heap: Buffers, ArrayBuffers and other native allocations it will free at collection. */
  readonly externalBytes: number;
  readonly heapLimitBytes: number;
}

export interface AdaptiveCapacitySettings {
  /** Lowest capacity the controller will report, even under heap pressure. */
  readonly minCapacity: number;
  /** Highest capacity the controller will report, regardless of headroom. */
  readonly maxCapacity: number;
  /** Share of the heap limit the controller keeps task memory below. */
  readonly heapTargetRatio: number;
  /** Estimate used for task types that have not been observed yet, per normal-cost task. */
  readonly defaultBytesPerTask: number;
  /** Largest step up between two timer decisions; steps down are unbounded and claims never step up. */
  readonly maxIncreasePerDecision: number;
  /** Runs estimated at or below this many bytes bypass the heap budget at claim time. */
  readonly lightTaskBytes: number;
  /** Normal-cost slots kept open for light runs while the heap budget is exhausted. */
  readonly lightTaskSlots: number;
  /** Restore instance estimates from task documents at claim time; off ignores the attribute. */
  readonly persistEstimates: boolean;
  /** Memory limit to budget the resident set against; undefined falls back to the cgroup limit Node reports, if any. */
  readonly memoryLimitBytes?: number;
  /** Share of the memory limit the resident set may reach before claiming stops. */
  readonly memoryTargetRatio: number;
}

/** Subscribes to major garbage collections; returns the unsubscribe function. */
export type MajorGcObserver = (onMajorGc: () => void) => () => void;

export type AdaptiveCapacityTrigger = 'tick' | 'claim';

/** The second budget, kept only when the process runs under a known memory limit. */
export interface AdaptiveMemoryState extends JsonObject {
  limit_bytes: number;
  target_bytes: number;
  rss_bytes: number;
  baseline_bytes: number;
  projected_bytes: number;
  budget_bytes: number;
}

export interface AdaptiveCapacityState extends JsonObject {
  capacity: number;
  heap_used_bytes: number;
  /** Memory outside the V8 heap at the time of the decision; sampled together with the heap. */
  heap_external_bytes: number;
  heap_limit_bytes: number;
  heap_target_bytes: number;
  heap_baseline_bytes: number;
  heap_projected_bytes: number;
  heap_budget_bytes: number;
  /** The budget claims are admitted against: the heap budget, or the memory budget when that is smaller. */
  budget_bytes: number;
  /** Which budget `budget_bytes` is; candidates are priced by their heap or their whole estimate accordingly. */
  budget_source: 'heap' | 'memory';
  memory: AdaptiveMemoryState | null;
  heap_live_ratio: number;
  bytes_per_normal_task: number;
  running_cost: number;
  free_slots: number;
  decisions: number;
  last_trigger: AdaptiveCapacityTrigger;
  estimates: TaskTypeMemoryEstimate[];
  /** Instances first budgeted from the estimate on their document rather than a cold-start default. */
  seeded_instances: number;
  /** Running tasks holding a reservation made through the run context, and their total. */
  reservations: { tasks: number; bytes: number };
  /** Runs that reported a memory peak through the run context since the node started. */
  reported_runs: number;
}

export interface AdaptiveCapacityControllerOpts {
  readonly logger: Logger;
  readonly settings: AdaptiveCapacitySettings;
  readonly getRunningTasks: () => readonly RunningTaskSnapshot[];
  readonly getHeapStats?: () => HeapStats;
  /** Resident set size; read only when a memory limit is known. */
  readonly getRssBytes?: () => number;
  /** The memory limit the process runs under, 0 when there is none. */
  readonly getConstrainedMemory?: () => number;
  readonly estimator?: TaskMemoryEstimator;
  readonly observeMajorGc?: MajorGcObserver;
}

const BASELINE_ALPHA = 0.2;

const MAX_OLD_SPACE_FLAG = /--max-old-space-size(?:=|\s+)(\d+)/g;

/**
 * Old-space limit set through `--max-old-space-size`, in bytes, or undefined
 * when the flag is absent. V8 reports `heap_size_limit` with the young
 * generation and code space added on top of it, so the old space fills, and
 * the process dies, before `used_heap_size` gets anywhere near that figure.
 */
export const readMaxOldSpaceBytes = (
  execArgv: readonly string[] = process.execArgv,
  nodeOptions: string | undefined = process.env.NODE_OPTIONS
): number | undefined => {
  // Command-line flags take precedence over NODE_OPTIONS, so they are scanned last.
  const flags = [nodeOptions ?? '', ...execArgv].join(' ');
  let lastMb: number | undefined;
  for (const match of flags.matchAll(MAX_OLD_SPACE_FLAG)) {
    lastMb = Number(match[1]);
  }
  return lastMb === undefined ? undefined : lastMb * 1024 * 1024;
};

/**
 * Heap used, memory outside the heap, and the limit the process will actually
 * die at: the old-space cap when one is set.
 */
export const readV8HeapStats = (): HeapStats => {
  const {
    used_heap_size: usedHeapBytes,
    external_memory: externalBytes,
    heap_size_limit: heapSizeLimit,
  } = getHeapStatistics();
  const maxOldSpaceBytes = readMaxOldSpaceBytes();
  return {
    usedHeapBytes,
    externalBytes,
    heapLimitBytes:
      maxOldSpaceBytes === undefined ? heapSizeLimit : Math.min(heapSizeLimit, maxOldSpaceBytes),
  };
};

interface GcEntryDetail {
  readonly kind?: number;
}

/** Watches V8 garbage-collection entries and calls back after each major (mark-compact) collection. */
export const observeV8MajorGc: MajorGcObserver = (onMajorGc) => {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // Garbage-collection entries carry `detail.kind`; the typings predate it.
      const { detail } = entry as { detail?: GcEntryDetail };
      if (detail?.kind === perfConstants.NODE_PERFORMANCE_GC_MAJOR) {
        onMajorGc();
        return;
      }
    }
  });
  observer.observe({ entryTypes: ['gc'] });
  return () => observer.disconnect();
};

const readRssBytes = (): number => process.memoryUsage.rss();
const readConstrainedMemory = (): number => process.constrainedMemory();

/**
 * Sizes Task Manager capacity from memory headroom instead of a fixed number.
 *
 * Each decision projects the memory the running tasks still need on top of the
 * idle baseline, subtracts that from the target, and converts what is left into
 * free slots using the learned cost of the recent task mix. The result is the
 * number of normal-cost tasks the pool may hold right now. The sampled signal
 * is the V8 heap plus the memory V8 tracks outside it (streamed buffers live
 * there), so the estimates cover both. Under a known memory limit a second
 * budget bounds the resident set the same way, and the smaller budget wins.
 * Decisions run on a timer for observability and again at every claim so the
 * gate reflects memory at the moment tasks are admitted.
 */
export class AdaptiveCapacityController {
  public readonly estimator: TaskMemoryEstimator;
  private readonly logger: Logger;
  private readonly settings: AdaptiveCapacitySettings;
  private readonly getRunningTasks: () => readonly RunningTaskSnapshot[];
  private readonly getHeapStats: () => HeapStats;
  private readonly getRssBytes: () => number;
  private readonly memoryLimitBytes?: number;
  private readonly capacitySubject: BehaviorSubject<number>;
  private readonly stateSubject: BehaviorSubject<AdaptiveCapacityState>;
  private readonly stopGcObserver: () => void;
  private baselineBytes?: number;
  private rssBaselineBytes?: number;
  private liveBaselineSeen = false;
  private currentCapacity: number;
  private decisions = 0;

  constructor({
    logger,
    settings,
    getRunningTasks,
    getHeapStats = readV8HeapStats,
    getRssBytes = readRssBytes,
    getConstrainedMemory = readConstrainedMemory,
    estimator,
    observeMajorGc = observeV8MajorGc,
  }: AdaptiveCapacityControllerOpts) {
    this.logger = logger;
    this.settings = settings;
    this.getRunningTasks = getRunningTasks;
    this.getHeapStats = getHeapStats;
    this.getRssBytes = getRssBytes;
    const constrained = settings.memoryLimitBytes ?? getConstrainedMemory();
    this.memoryLimitBytes = constrained > 0 ? constrained : undefined;
    this.estimator =
      estimator ??
      new TaskMemoryEstimator({
        defaultBytesPerTask: settings.defaultBytesPerTask,
        lightBytesPerCostUnit: settings.lightTaskBytes / TaskCost.Normal,
      });
    this.stopGcObserver = observeMajorGc(() => {
      const { usedHeapBytes, externalBytes } = this.getHeapStats();
      this.estimator.liveSample(usedHeapBytes, externalBytes);
      this.observeLiveBaseline(usedHeapBytes);
    });
    this.currentCapacity = settings.minCapacity;
    const initial = this.decide('tick');
    this.currentCapacity = initial.capacity;
    this.stateSubject = new BehaviorSubject<AdaptiveCapacityState>(initial);
    this.capacitySubject = new BehaviorSubject<number>(initial.capacity);
  }

  /** Current capacity in normal-cost tasks; emits on every change. */
  public get capacity$(): Observable<number> {
    return this.capacitySubject.asObservable();
  }

  public get state$(): Observable<AdaptiveCapacityState> {
    return this.stateSubject.asObservable();
  }

  public get state(): AdaptiveCapacityState {
    return this.stateSubject.value;
  }

  /** Feeds the estimator one memory sample and makes a decision. */
  public tick(): number {
    this.sampleEstimator(this.getRunningTasks());
    return this.refresh('tick');
  }

  private sampleEstimator(running: readonly RunningTaskSnapshot[]): void {
    const { usedHeapBytes, externalBytes } = this.getHeapStats();
    this.estimator.sample(usedHeapBytes, running, externalBytes);
  }

  /** Releases the garbage-collection observer. */
  public stop(): void {
    this.stopGcObserver();
  }

  /**
   * Memory budget for the claim that follows the latest decision. Candidates
   * are priced by what the binding budget holds: their heap share against the
   * heap budget, their whole estimate against the container budget.
   */
  public memoryGate(): ClaimMemoryGate {
    const {
      budget_bytes: budgetBytes,
      budget_source: source,
      reservations,
    } = this.stateSubject.value;
    return {
      budgetBytes: Math.max(0, budgetBytes),
      lightTaskBytes: this.settings.lightTaskBytes,
      isLight: (taskId, taskType, cost) =>
        this.estimator.estimateBytes(taskId, taskType, cost) <= this.settings.lightTaskBytes,
      reservedBytes: reservations.bytes,
      estimateBytes: (taskId, taskType, cost) =>
        source === 'memory'
          ? this.estimator.estimateBytes(taskId, taskType, cost)
          : this.estimator.estimateHeapBytes(taskId, taskType, cost),
      seed: (taskId, taskType, cost, estimate) =>
        this.settings.persistEstimates &&
        this.estimator.seed(taskId, taskType, cost, estimate.bytes, estimate.samples),
    };
  }

  /**
   * Closes out a run the moment the pool drops it, attributing the heap growth
   * since the last sample to it and whatever else is still running. A run the
   * runner already reported through `observeRunEnd()` is left alone.
   */
  public taskEnded(task: RunningTaskSnapshot): void {
    if (this.estimator.isFinalized(task.executionId)) return;
    this.sampleEstimator([...this.getRunningTasks(), task]);
    this.estimator.taskEnded(task);
  }

  /**
   * Closes out a run from inside the runner, before its document is updated,
   * and returns the estimate to persist with it. `reportedBytes` is the peak
   * the task reported through the run context, if it reported at all.
   */
  public observeRunEnd(
    task: RunningTaskSnapshot,
    reportedBytes?: number
  ): RunMemoryObservation | undefined {
    if (this.estimator.isFinalized(task.executionId)) return undefined;
    this.sampleEstimator([...this.getRunningTasks(), task]);
    return this.estimator.finalizeRun(task, reportedBytes);
  }

  /**
   * Right after a major collection the heap holds live data only: the idle
   * baseline plus what the running tasks still need. Taking the running
   * estimates off gives a baseline free of garbage that keeps tracking under
   * steady load, when the pool never empties.
   */
  private observeLiveBaseline(liveHeapBytes: number): void {
    const running = this.getRunningTasks();
    const first = this.baselineBytes === undefined || !this.liveBaselineSeen;
    this.baselineBytes = ewma(
      Math.max(0, liveHeapBytes - this.committedBytes(running, 'heap')),
      this.baselineBytes,
      first
    );
    if (this.memoryLimitBytes !== undefined) {
      // The resident set does not shrink with a collection the way the heap does,
      // but net of the running estimates it is the idle floor the projection needs.
      this.rssBaselineBytes = ewma(
        Math.max(0, this.getRssBytes() - this.committedBytes(running, 'memory')),
        this.rssBaselineBytes,
        first
      );
    }
    this.liveBaselineSeen = true;
  }

  /**
   * What the running tasks are budgeted at: the learned estimate, or the
   * reservation when it is larger. The heap budget sees each run's heap share
   * (a reservation is taken as whole-run memory, so it is scaled by the type's
   * share too); the container budget sees the whole estimate.
   */
  private committedBytes(running: readonly RunningTaskSnapshot[], kind: 'heap' | 'memory'): number {
    return running.reduce((sum, task) => {
      const reserved = task.reservedBytes ?? 0;
      return (
        sum +
        (kind === 'memory'
          ? Math.max(this.estimator.estimateBytes(task.taskId, task.taskType, task.cost), reserved)
          : Math.max(
              this.estimator.estimateHeapBytes(task.taskId, task.taskType, task.cost),
              reserved * this.estimator.heapShare(task.taskType)
            ))
      );
    }, 0);
  }

  /** Re-evaluates capacity now; returns the new value and emits it if it changed. */
  public refresh(trigger: AdaptiveCapacityTrigger): number {
    const state = this.decide(trigger);
    const previous = this.currentCapacity;
    this.currentCapacity = state.capacity;
    this.stateSubject.next(state);
    if (state.capacity !== previous) {
      this.logger.debug(
        `Adaptive capacity ${previous} -> ${state.capacity} on ${trigger}: heap ${mb(
          state.heap_used_bytes
        )}+${mb(state.heap_external_bytes)}/${mb(state.heap_limit_bytes)} MB, projected ${mb(
          state.heap_projected_bytes
        )} MB, heap budget ${mb(state.heap_budget_bytes)} MB${
          state.memory
            ? `, rss ${mb(state.memory.rss_bytes)}/${mb(
                state.memory.limit_bytes
              )} MB, memory budget ${mb(state.memory.budget_bytes)} MB`
            : ''
        }, budget ${mb(state.budget_bytes)} MB at ${mb(
          state.bytes_per_normal_task
        )} MB per task, running cost ${state.running_cost}, reserved ${mb(
          state.reservations.bytes
        )} MB`
      );
      this.capacitySubject.next(state.capacity);
    }
    return state.capacity;
  }

  private decide(trigger: AdaptiveCapacityTrigger): AdaptiveCapacityState {
    const { usedHeapBytes, externalBytes, heapLimitBytes } = this.getHeapStats();
    const running = this.getRunningTasks();
    const {
      minCapacity,
      maxCapacity,
      heapTargetRatio,
      maxIncreasePerDecision,
      lightTaskSlots,
      memoryTargetRatio,
    } = this.settings;
    const rssBytes = this.memoryLimitBytes === undefined ? 0 : this.getRssBytes();

    // Until a major collection has been observed, an idle process (garbage included)
    // is the only baseline available; it errs on the safe side.
    if (running.length === 0 && !this.liveBaselineSeen) {
      const first = this.baselineBytes === undefined;
      this.baselineBytes = ewma(usedHeapBytes, this.baselineBytes, first);
      if (this.memoryLimitBytes !== undefined) {
        this.rssBaselineBytes = ewma(rssBytes, this.rssBaselineBytes, first);
      }
    }
    const baseline = this.baselineBytes ?? usedHeapBytes;

    // The heap budget guards V8's abort, so it sees heap only: used heap and the
    // heap share of the running estimates.
    const runningCost = running.reduce((sum, task) => sum + task.cost, 0);
    const committedHeapBytes = this.committedBytes(running, 'heap');
    const targetBytes = heapLimitBytes * heapTargetRatio;
    const projectedBytes = Math.max(usedHeapBytes, baseline + committedHeapBytes);
    const heapBudgetBytes = targetBytes - projectedBytes;

    // Under a known limit the resident set gets the same arithmetic with the whole
    // estimates (buffers outside the heap included), and the tighter of the two
    // budgets is what claims are admitted against.
    let memory: AdaptiveMemoryState | null = null;
    let budgetBytes = heapBudgetBytes;
    let budgetSource: 'heap' | 'memory' = 'heap';
    if (this.memoryLimitBytes !== undefined) {
      const memoryTargetBytes = this.memoryLimitBytes * memoryTargetRatio;
      const rssBaseline = this.rssBaselineBytes ?? rssBytes;
      const memoryProjectedBytes = Math.max(
        rssBytes,
        rssBaseline + this.committedBytes(running, 'memory')
      );
      const memoryBudgetBytes = memoryTargetBytes - memoryProjectedBytes;
      memory = {
        limit_bytes: this.memoryLimitBytes,
        target_bytes: Math.round(memoryTargetBytes),
        rss_bytes: rssBytes,
        baseline_bytes: Math.round(rssBaseline),
        projected_bytes: Math.round(memoryProjectedBytes),
        budget_bytes: Math.round(memoryBudgetBytes),
      };
      if (memoryBudgetBytes < heapBudgetBytes) {
        budgetBytes = memoryBudgetBytes;
        budgetSource = 'memory';
      }
    }

    const reserved = running.filter((task) => (task.reservedBytes ?? 0) > 0);
    const reservations = {
      tasks: reserved.length,
      bytes: reserved.reduce((sum, task) => sum + (task.reservedBytes ?? 0), 0),
    };
    const bytesPerNormalTask = this.estimator.bytesPerCostUnit() * TaskCost.Normal;
    const freeSlots = budgetBytes > 0 ? Math.floor(budgetBytes / bytesPerNormalTask) : 0;
    const runningSlots = Math.ceil(runningCost / TaskCost.Normal);

    const previous = this.currentCapacity;
    // Light runs are admitted against capacity only, so keep `lightTaskSlots`
    // open beyond the running set even when the heap budget is exhausted.
    const wanted = Math.min(
      maxCapacity,
      Math.max(minCapacity, runningSlots + Math.max(freeSlots, lightTaskSlots))
    );
    // A claim-time decision only lowers capacity; the timer raises it, one bounded step at a time.
    const capacity =
      wanted <= previous
        ? wanted
        : trigger === 'claim'
        ? previous
        : Math.min(wanted, previous + maxIncreasePerDecision);
    this.decisions++;

    return {
      capacity,
      heap_used_bytes: usedHeapBytes,
      heap_external_bytes: externalBytes,
      heap_limit_bytes: heapLimitBytes,
      heap_target_bytes: Math.round(targetBytes),
      heap_baseline_bytes: Math.round(baseline),
      heap_projected_bytes: Math.round(projectedBytes),
      heap_budget_bytes: Math.round(heapBudgetBytes),
      budget_bytes: Math.round(budgetBytes),
      budget_source: budgetSource,
      memory,
      heap_live_ratio: Number(this.estimator.liveRatio().toFixed(3)),
      bytes_per_normal_task: Math.round(bytesPerNormalTask),
      running_cost: runningCost,
      free_slots: freeSlots,
      decisions: this.decisions,
      last_trigger: trigger,
      estimates: this.estimator.snapshot(),
      seeded_instances: this.estimator.seededCount(),
      reservations,
      reported_runs: this.estimator.reportedRunCount(),
    };
  }
}

const ewma = (observed: number, previous: number | undefined, first: boolean): number =>
  first || previous === undefined
    ? observed
    : BASELINE_ALPHA * observed + (1 - BASELINE_ALPHA) * previous;

const mb = (bytes: number): string => (bytes / (1024 * 1024)).toFixed(0);
