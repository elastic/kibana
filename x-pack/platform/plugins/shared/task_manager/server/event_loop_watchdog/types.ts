/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Cadence of the watchdog. Internal constants, deliberately not configurable. */
export const HEARTBEAT_INTERVAL_MS = 50;
export const POLL_INTERVAL_MS = 25;
/** The worker considers the main thread blocked once its heartbeat is this stale. */
export const DETECT_THRESHOLD_MS = 200;
/** Sampling of the main thread's current task starts once a block has lasted this long. */
export const SAMPLE_AFTER_MS = 500;
export const SAMPLE_INTERVAL_MS = 250;
/** Sampling lasts the whole block (10 minutes at one sample per interval); this only bounds memory. */
export const MAX_SAMPLES_PER_BLOCK = 2400;
/** At most this fraction of the sampled part of a block may go to non-top contexts. */
export const MIN_TOP_TASK_SHARE = 0.8;

export const CURRENT_TASK_ACCESSOR = Symbol.for('kbn.taskManager.currentTask');

/** Process-wide monotonic microseconds: the one clock shared by the main thread and the worker. */
export const monotonicUs = (): number => Number(process.hrtime.bigint() / 1000n);

export interface CurrentTaskContext {
  taskId: string;
  taskType: string;
  executionUuid: string;
}

export interface WatchdogWorkerData {
  /** One BigInt64 slot: the main thread's last heartbeat in monotonic microseconds. */
  shared: SharedArrayBuffer;
  flagThresholdMs: number;
  minCpuRatio: number;
  liveReportIntervalMs: number;
}

/** One `Runtime.evaluate` of the main thread's current task, dispatched while it was blocked. */
export interface ContextSample {
  postedAtUs: number;
  /** Main thread clock at the moment the evaluate ran. Undefined while still in flight. */
  landedAtUs?: number;
  task: CurrentTaskContext | null;
  /** The accessor was not installed, or the evaluate failed. */
  missing: boolean;
}

export interface TaskObservation extends CurrentTaskContext {
  observedMs: number;
  samples: number;
}

/**
 * Partition of a block's timeline. `unsampledMs + opaqueMs + noContextMs + sum(perTask.observedMs)`
 * equals `blockedMs`. Only `perTask` time is ever credited to a task.
 */
export interface BlockAttribution {
  blockedMs: number;
  /** `unsampledPrefixMs + unsampledTailMs`. */
  unsampledMs: number;
  /** From the start of the block to the first evaluate being posted. */
  unsampledPrefixMs: number;
  /** After the last landing, beyond the one interval credited to it (only when sampling stopped). */
  unsampledTailMs: number;
  /** Between posting an evaluate and it landing: uninterruptible native work, owner unknown. */
  opaqueMs: number;
  /** Part of `opaqueMs` bounded on both sides by the same task. Reported, never credited. */
  inferredMs: number;
  /** Sampled intervals where no task context was current. */
  noContextMs: number;
  samples: number;
  missingAccessor: boolean;
  perTask: TaskObservation[];
}

export type FlagReason =
  | 'below-threshold'
  | 'cpu-starved'
  | 'unsampled'
  | 'no-context'
  | 'opaque-dominated'
  | 'multiple-contexts';

export interface FlagEvidence {
  blockedMs: number;
  observedMs: number;
  opaqueMs: number;
  unsampledMs: number;
  inferredMs: number;
  samples: number;
  cpuRatio: number;
  startedAt: string;
  endedAt: string;
}

export type FlagDecision =
  | ({ flagged: true } & CurrentTaskContext & { evidence: FlagEvidence })
  | { flagged: false; reason: FlagReason };

export interface EventLoopBlockReport {
  blockedMs: number;
  /** Block bounds in monotonic microseconds: the heartbeat stamp it started at and the first fresh one. */
  startedAtUs: number;
  endedAtUs: number;
  startedAt: string;
  endedAt: string;
  attribution: BlockAttribution;
  /** Process CPU time over the wall time from detection to the end of the block. */
  cpuRatio: number;
  flag: FlagDecision;
  /** False when the unflagged log line is rate limited. Flagged blocks are always logged. */
  reportable: boolean;
  suppressedBlocks: number;
}

/** Observes one task run so its completion path can learn whether it blocked the event loop. */
export interface EventLoopRunObservation {
  /** Reports of the blocks that overlapped the run. Never rejects; `[]` when none or disabled. */
  end(): Promise<EventLoopBlockReport[]>;
}

export interface EventLoopRunObserver {
  beginRun(executionUuid: string): EventLoopRunObservation;
}

export type WorkerToMainMessage =
  | { type: 'ready' }
  | { type: 'block'; report: EventLoopBlockReport }
  | { type: 'worker-error'; message: string };
