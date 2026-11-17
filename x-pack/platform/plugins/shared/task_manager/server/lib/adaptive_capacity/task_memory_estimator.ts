/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonObject } from '@kbn/utility-types';
import type { RunningTaskSnapshot } from '../../task_pool';
import { TaskCost } from '../../task';

export interface TaskMemoryEstimatorOpts {
  /**
   * Estimate for a task that has never been observed, per run. Flat on purpose:
   * `cost` describes CPU and Elasticsearch load, not heap, and pricing an
   * ExtraLarge task at ten times the default would keep it out of a small
   * node's budget until it ran, which it then never would.
   */
  readonly defaultBytesPerTask: number;
  /** Lower bound for any estimate, per cost unit. */
  readonly minBytesPerCostUnit?: number;
  /** Weight of the newest observation in the moving averages (0..1). */
  readonly alpha?: number;
  /** Percentile of recent runs used to size a free slot (0..1); high values favour the heavy runs in the mix. */
  readonly slotPercentile?: number;
  /** How many recent runs the slot percentile is computed over. */
  readonly windowSize?: number;
  /** How many task instances keep their own estimate before the oldest is dropped. */
  readonly maxInstances?: number;
  /** Allocation volume after which the live-to-allocated ratio is re-estimated. */
  readonly calibrationBytes?: number;
  /** Runs at or below this many bytes per cost unit are light and do not take part in slot sizing. */
  readonly lightBytesPerCostUnit?: number;
}

export interface TaskTypeMemoryEstimate extends JsonObject {
  task_type: string;
  bytes_per_cost_unit: number;
  /** Share of the type's memory that lands on the V8 heap; the rest is external (Buffers, ArrayBuffers). */
  heap_share: number;
  samples: number;
}

interface Estimate {
  bytesPerCostUnit: number;
  samples: number;
  /** Restored from the task document; already scaled by the writer's live ratio and replaced by the first local observation. */
  seeded?: boolean;
}

export interface RunMemoryObservation {
  /** Heap attributed to the run that just ended, scaled by the live ratio. */
  readonly bytes: number;
  /** The instance's moving average per run after this observation, scaled by the live ratio. */
  readonly instanceBytes: number;
  /** Runs the instance average is built from. */
  readonly samples: number;
}

interface TypeEstimate {
  /** Most recent observations of this type, per cost unit, oldest first. */
  readonly recent: number[];
  samples: number;
  /** Moving average of the heap share of this type's runs; 1 until an external allocation is seen. */
  heapShare: number;
}

interface InFlightRun {
  readonly taskId: string;
  readonly taskType: string;
  readonly cost: number;
  /** Heap growth attributed so far. */
  bytes: number;
  /** Growth outside the heap attributed so far. */
  externalBytes: number;
}

const DEFAULT_ALPHA = 0.3;
const DEFAULT_MIN_BYTES_PER_COST_UNIT = 512 * 1024;
const DEFAULT_SLOT_PERCENTILE = 0.9;
const DEFAULT_WINDOW_SIZE = 200;
const TYPE_WINDOW_SIZE = 32;
const DEFAULT_MAX_INSTANCES = 10_000;
const DEFAULT_CALIBRATION_BYTES = 256 * 1024 * 1024;
const MIN_LIVE_RATIO = 0.1;
const DEFAULT_LIGHT_BYTES_PER_COST_UNIT = 0;
const MAX_FINALIZED_RUNS = 10_000;

/**
 * Learns how much heap each task needs from what the pool is running.
 *
 * Every sample compares the heap used now with the previous sample. Heap growth
 * is attributed to the tasks that were running during the interval, weighted by
 * their cost. When a run ends its accumulated share becomes one observation,
 * folded into a moving average for that task instance and another for its type.
 * Recurring tasks keep a stable id, so the instance average predicts the next
 * run of the same rule or workflow. Instances that have not run yet take the
 * cold-start default, or the heavy end (`slotPercentile`) of their type's
 * recent runs when that is larger: one type can hold a 230 KB rule and a 46 MB
 * rule, and cheap instances must never make an unseen expensive one look
 * light, however many of them ran first. Heap released by
 * garbage collection is ignored, so the estimate
 * is an allocation footprint, which errs on the side of claiming less rather
 * than more. Free slots are sized from a high percentile of the recent runs, so
 * a mix of heavy and cheap runs is budgeted for the heavy ones rather than for
 * whichever finished last. Light runs (at or below `lightBytesPerCostUnit`) are
 * left out of that percentile: they are admitted against capacity rather than
 * the heap budget, so a mix dominated by them must not shrink the slot that
 * heavy runs are budgeted with.
 *
 * The allocation footprint is calibrated against live heap: `liveSample()` is
 * fed the heap used right after each major garbage collection, and the ratio of
 * live growth to allocated growth over the same period scales every estimate.
 * Transient garbage inflates allocation but not live heap, so the ratio brings
 * the budget closer to what the runs actually occupy at once.
 */
export class TaskMemoryEstimator {
  private readonly defaultBytesPerTask: number;
  private readonly minBytesPerCostUnit: number;
  private readonly alpha: number;
  private readonly slotPercentile: number;
  private readonly windowSize: number;
  private readonly maxInstances: number;
  private readonly calibrationBytes: number;
  private readonly lightBytesPerCostUnit: number;
  private readonly byInstance = new Map<string, Estimate>();
  private readonly byType = new Map<string, TypeEstimate>();
  private readonly inFlight = new Map<string, InFlightRun>();
  /** Runs already finalised through `finalizeRun()`, so a later pool notification does not count them twice. */
  private readonly finalized = new Set<string>();
  private readonly recent: number[] = [];
  private seededInstances = 0;
  private reportedRuns = 0;
  private lastUsedHeapBytes?: number;
  private lastExternalBytes?: number;
  private lastLiveBytes?: number;
  private allocatedGrowth = 0;
  private liveGrowth = 0;
  private ratio = 1;

  constructor({
    defaultBytesPerTask,
    minBytesPerCostUnit = DEFAULT_MIN_BYTES_PER_COST_UNIT,
    alpha = DEFAULT_ALPHA,
    slotPercentile = DEFAULT_SLOT_PERCENTILE,
    windowSize = DEFAULT_WINDOW_SIZE,
    maxInstances = DEFAULT_MAX_INSTANCES,
    calibrationBytes = DEFAULT_CALIBRATION_BYTES,
    lightBytesPerCostUnit = DEFAULT_LIGHT_BYTES_PER_COST_UNIT,
  }: TaskMemoryEstimatorOpts) {
    this.defaultBytesPerTask = defaultBytesPerTask;
    this.minBytesPerCostUnit = minBytesPerCostUnit;
    this.alpha = alpha;
    this.slotPercentile = slotPercentile;
    this.windowSize = windowSize;
    this.maxInstances = maxInstances;
    this.calibrationBytes = calibrationBytes;
    this.lightBytesPerCostUnit = lightBytesPerCostUnit;
  }

  /**
   * Records one memory sample together with the tasks that were running when it
   * was taken. Heap growth and growth outside the heap (`externalBytes`, what V8
   * tracks for Buffers and ArrayBuffers) are attributed separately, so a type
   * that streams into buffers learns how much of its footprint is heap.
   */
  public sample(
    usedHeapBytes: number,
    running: readonly RunningTaskSnapshot[],
    externalBytes = 0
  ): void {
    for (const task of running) {
      if (!this.inFlight.has(task.executionId) && !this.finalized.has(task.executionId)) {
        this.inFlight.set(task.executionId, {
          taskId: task.taskId,
          taskType: task.taskType,
          cost: task.cost,
          bytes: 0,
          externalBytes: 0,
        });
      }
    }

    const heapDelta =
      this.lastUsedHeapBytes === undefined ? 0 : usedHeapBytes - this.lastUsedHeapBytes;
    const externalDelta =
      this.lastExternalBytes === undefined ? 0 : externalBytes - this.lastExternalBytes;
    this.lastUsedHeapBytes = usedHeapBytes;
    this.lastExternalBytes = externalBytes;

    if (heapDelta > 0) this.allocatedGrowth += heapDelta;
    if (externalDelta > 0) this.allocatedGrowth += externalDelta;
    if ((heapDelta > 0 || externalDelta > 0) && running.length > 0) {
      const totalCost = running.reduce((sum, task) => sum + task.cost, 0);
      for (const task of running) {
        const run = this.inFlight.get(task.executionId);
        if (!run) continue;
        if (heapDelta > 0) run.bytes += (heapDelta * task.cost) / totalCost;
        if (externalDelta > 0) run.externalBytes += (externalDelta * task.cost) / totalCost;
      }
    }

    const runningIds = new Set(running.map((task) => task.executionId));
    for (const [executionId, run] of this.inFlight) {
      if (!runningIds.has(executionId)) {
        this.inFlight.delete(executionId);
        this.observe(run);
      }
    }
  }

  /**
   * Finalises a run the moment it ends. Callers should `sample()` first with the
   * ending run still in the running set, so growth since the last sample is
   * attributed to it; otherwise runs shorter than the sample interval would
   * look free. `reportedBytes` is the peak the task reported through the run
   * context; it can only raise the observation.
   */
  public taskEnded(task: RunningTaskSnapshot, reportedBytes?: number): void {
    if (this.finalized.has(task.executionId)) return;
    const run = this.inFlight.get(task.executionId) ?? {
      taskId: task.taskId,
      taskType: task.taskType,
      cost: task.cost,
      bytes: 0,
      externalBytes: 0,
    };
    this.inFlight.delete(task.executionId);
    this.observe(run, reportedBytes);
  }

  /**
   * Finalises a run from inside the runner, before the task document is
   * updated, and returns what was learned so it can be written to the document
   * and the event log. A later `taskEnded()` for the same execution is a no-op.
   */
  public finalizeRun(
    task: RunningTaskSnapshot,
    reportedBytes?: number
  ): RunMemoryObservation | undefined {
    if (this.finalized.has(task.executionId)) return undefined;
    this.taskEnded(task, reportedBytes);
    this.finalized.add(task.executionId);
    if (this.finalized.size > MAX_FINALIZED_RUNS) {
      const oldest = this.finalized.values().next().value;
      if (oldest !== undefined) this.finalized.delete(oldest);
    }
    const instance = this.byInstance.get(task.taskId);
    if (instance === undefined) return undefined;
    const lastObserved = this.recent[this.recent.length - 1] ?? 0;
    return {
      bytes: Math.round(lastObserved * task.cost * this.ratio),
      instanceBytes: Math.round(this.instanceBytesPerRun(instance, task.cost)),
      samples: instance.samples,
    };
  }

  /** Whether `finalizeRun()` already closed out this execution. */
  public isFinalized(executionId: string): boolean {
    return this.finalized.has(executionId);
  }

  /**
   * Restores an instance estimate from its task document. Only an instance this
   * node has not observed takes the seed; the type history is left alone so a
   * restart does not replay stale runs into the type percentile.
   */
  public seed(
    taskId: string,
    taskType: string,
    cost: number,
    bytes: number,
    samples: number
  ): boolean {
    if (this.byInstance.has(taskId) || cost <= 0 || !(bytes >= 0)) return false;
    this.byInstance.set(taskId, {
      bytesPerCostUnit: bytes / cost,
      samples: Math.max(1, Math.floor(samples)),
      seeded: true,
    });
    this.trimInstances();
    this.seededInstances++;
    return true;
  }

  /** Runs that reported a memory peak through the run context since the node started. */
  public reportedRunCount(): number {
    return this.reportedRuns;
  }

  /** Instances whose first estimate on this node came from their document. */
  public seededCount(): number {
    return this.seededInstances;
  }

  /**
   * Records the memory in use right after a major garbage collection, heap and
   * external. Growth between two such samples is live data; comparing it with
   * the allocation seen by `sample()` over the same period calibrates the
   * estimates.
   */
  public liveSample(usedHeapBytes: number, externalBytes = 0): void {
    const liveBytes = usedHeapBytes + externalBytes;
    if (this.lastLiveBytes !== undefined) {
      const delta = liveBytes - this.lastLiveBytes;
      if (delta > 0) this.liveGrowth += delta;
    }
    this.lastLiveBytes = liveBytes;
    if (this.allocatedGrowth < this.calibrationBytes) return;
    const observed = Math.min(1, Math.max(MIN_LIVE_RATIO, this.liveGrowth / this.allocatedGrowth));
    this.ratio = this.alpha * observed + (1 - this.alpha) * this.ratio;
    this.allocatedGrowth = 0;
    this.liveGrowth = 0;
  }

  /** Live-to-allocated heap ratio applied to every estimate; 1 until calibrated. */
  public liveRatio(): number {
    return this.ratio;
  }

  /**
   * Estimated heap for one run of this task: its own history when it has one,
   * otherwise the cold-start default, raised to the heavy end of its type when
   * that is larger. The type history never lowers an unseen instance below the
   * default: on a fresh node the cheap instances of a type run first, and for a
   * while they are all the type has seen, so an estimate taken from them would
   * admit every unseen heavy instance at once.
   */
  public estimateBytes(taskId: string, taskType: string, cost: number): number {
    const instance = this.byInstance.get(taskId);
    if (instance !== undefined) {
      return (
        Math.max(this.instanceBytesPerRun(instance, cost) / cost, this.minBytesPerCostUnit) * cost
      );
    }
    const learned = this.typeBytesPerCostUnit(taskType);
    const fromType = learned === undefined ? 0 : learned * this.ratio * cost;
    return Math.max(fromType, this.defaultBytesPerTask, this.minBytesPerCostUnit * cost);
  }

  /**
   * The part of `estimateBytes()` expected on the V8 heap, from the type's
   * learned heap share: what the heap budget must hold for the run, while the
   * container budget holds the whole estimate.
   */
  public estimateHeapBytes(taskId: string, taskType: string, cost: number): number {
    return Math.max(
      this.estimateBytes(taskId, taskType, cost) * this.heapShare(taskType),
      this.minBytesPerCostUnit * cost
    );
  }

  /** Share of a type's memory that lands on the heap; 1 until the type has shown external allocations. */
  public heapShare(taskType: string): number {
    return this.byType.get(taskType)?.heapShare ?? 1;
  }

  /** Bytes per run for an instance; a seeded value already carries the writer's live ratio. */
  private instanceBytesPerRun(instance: Estimate, cost: number): number {
    return instance.bytesPerCostUnit * cost * (instance.seeded ? 1 : this.ratio);
  }

  /** Heap per cost unit at the slot percentile of the recent heavy runs, used to size free slots. */
  public bytesPerCostUnit(): number {
    const heavy = this.recent
      .map((bytes) => bytes * this.ratio)
      .filter((bytes) => bytes > this.lightBytesPerCostUnit);
    if (heavy.length === 0) {
      return Math.max(this.defaultBytesPerTask / TaskCost.Normal, this.minBytesPerCostUnit);
    }
    return Math.max(percentile(heavy, this.slotPercentile), this.minBytesPerCostUnit);
  }

  /** Per-cost-unit estimate of a type at the slot percentile of its recent runs; undefined until it has run. */
  private typeBytesPerCostUnit(taskType: string): number | undefined {
    const estimate = this.byType.get(taskType);
    return estimate === undefined ? undefined : percentile(estimate.recent, this.slotPercentile);
  }

  /** Whether any run has ended on this node yet. */
  public hasObservations(): boolean {
    return this.byType.size > 0;
  }

  /** The largest per-type estimates, for the health endpoint. */
  public snapshot(limit = 10): TaskTypeMemoryEstimate[] {
    return Array.from(this.byType, ([taskType, estimate]) => ({
      task_type: taskType,
      bytes_per_cost_unit: Math.round(percentile(estimate.recent, this.slotPercentile)),
      heap_share: Number(estimate.heapShare.toFixed(2)),
      samples: estimate.samples,
    }))
      .sort((a, b) => b.bytes_per_cost_unit - a.bytes_per_cost_unit)
      .slice(0, limit);
  }

  /**
   * Turns a finished run into one observation: the larger of the attributed
   * growth and the task's own report, per cost unit, folded into the type's
   * window and heap share and into the instance's moving average.
   */
  private observe(run: InFlightRun, reportedBytes?: number): void {
    // A report is live bytes the task held. The measured share is allocation
    // that the live ratio scales down later, so the report is lifted into the
    // same domain before the larger of the two is kept.
    const measured = run.bytes + run.externalBytes;
    let bytes = measured;
    if (reportedBytes !== undefined) {
      this.reportedRuns++;
      bytes = Math.max(bytes, reportedBytes / this.ratio);
    }
    const observed = run.cost > 0 ? bytes / run.cost : bytes;
    const type = this.byType.get(run.taskType) ?? { recent: [], samples: 0, heapShare: 1 };
    // A run that allocated nothing says nothing about the split; a report is
    // taken as external, since that is what the process-level view misses.
    if (bytes > 0) {
      const heapShare = Math.min(1, run.bytes / bytes);
      type.heapShare =
        type.samples === 0 ? heapShare : this.alpha * heapShare + (1 - this.alpha) * type.heapShare;
    }
    type.recent.push(observed);
    if (type.recent.length > TYPE_WINDOW_SIZE) type.recent.shift();
    type.samples++;
    this.byType.set(run.taskType, type);
    this.fold(this.byInstance, run.taskId, observed);
    this.trimInstances();
    this.recent.push(observed);
    if (this.recent.length > this.windowSize) this.recent.shift();
  }

  /** Drops the least recently inserted instance estimate once the map is over its limit. */
  private trimInstances(): void {
    if (this.byInstance.size > this.maxInstances) {
      const oldest = this.byInstance.keys().next().value;
      if (oldest !== undefined) this.byInstance.delete(oldest);
    }
  }

  /**
   * Merges an observation into an estimate as an exponentially weighted moving
   * average (`alpha` × new + (1 − `alpha`) × old), so the latest runs dominate
   * and a seeded value from a document is replaced by the first local one.
   */
  private fold(estimates: Map<string, Estimate>, key: string, observed: number): void {
    const current = estimates.get(key);
    if (current?.seeded) {
      // The node's own observation replaces the document's value outright.
      estimates.set(key, { bytesPerCostUnit: observed, samples: current.samples + 1 });
      return;
    }
    if (current) {
      current.bytesPerCostUnit =
        this.alpha * observed + (1 - this.alpha) * current.bytesPerCostUnit;
      current.samples++;
      return;
    }
    estimates.set(key, { bytesPerCostUnit: observed, samples: 1 });
  }
}

/** Value at `fraction` of the way through `values` once sorted; `values` must not be empty. */
const percentile = (values: readonly number[], fraction: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(fraction * sorted.length));
  return sorted[index];
};
