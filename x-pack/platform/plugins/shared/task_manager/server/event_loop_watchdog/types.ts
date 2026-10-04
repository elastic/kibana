/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Configuration accepted by the watchdog, resolved from `EventLoopWatchdogConfig`. */
export interface EventLoopWatchdogOpts {
  /** Minimum uninterrupted event-loop block duration (ms) that triggers a report. */
  thresholdMs: number;
  /** How often (ms) the main thread stamps its heartbeat. */
  heartbeatIntervalMs: number;
  /** How often (ms) the worker checks the heartbeat for staleness. */
  pollIntervalMs: number;
  /** How often (ms) a still-blocked notice is emitted while a block is ongoing. */
  liveReportIntervalMs: number;
  /** Suppress repeat full reports for the same task type within this window (ms). */
  dedupWindowMs: number;
}

/** Data passed to the worker thread at spawn time. */
export interface WorkerData {
  /** Backing store for the heartbeat timestamp, written by the main thread via Atomics. */
  sharedHeartbeatBuffer: SharedArrayBuffer;
  opts: EventLoopWatchdogOpts;
}

/** A task run known to be in flight when a block was detected. */
export interface TaskSuspect {
  taskId: string;
  taskType: string;
  /** How long (ms) the task had been running when the block started. */
  inFlightMs: number;
}

/** One aggregated call-tree entry from the captured CPU profile. */
export interface ProfileFrame {
  functionName: string;
  url: string;
  /** Self time attributed to this frame across all samples (ms). */
  selfTimeMs: number;
  /** Self time as a percentage of the total sampled duration. */
  selfTimePercent: number;
}

/** A completed block-detection report, ready to be logged. */
export interface BlockReport {
  blockedMs: number;
  startedAt: number;
  endedAt: number;
  suspects: TaskSuspect[];
  topFrames: ProfileFrame[];
  /** True when garbage collection accounts for most of the sampled self time. */
  gcDominant: boolean;
  /**
   * True when the captured profile samples cover only a small fraction of the block,
   * suggesting a native/syscall wait or OS preemption rather than JS CPU work.
   */
  likelyUnsampled: boolean;
  /** Fraction (0-1) of the block duration actually covered by profiler samples. */
  sampledCoverage: number;
  /** Similar blocks (same suspect task types) suppressed since the last report, if any. */
  suppressedCount: number;
}

/**
 * A block still ongoing, reported periodically so wedged/infinite loops are never silent.
 * Written directly to the process's stderr fd from the worker (see `worker.ts`) rather
 * than sent via `postMessage`, because `postMessage` to the main thread is only processed
 * once its event loop is free again - exactly what does not happen while it is blocked.
 */
export interface StillBlockedNotice {
  elapsedMs: number;
  suspects: TaskSuspect[];
}

export type MainToWorkerMessage =
  | { type: 'run-start'; taskId: string; taskType: string; startedAt: number }
  | { type: 'run-end'; taskId: string };

export type WorkerToMainMessage =
  | { type: 'report'; report: BlockReport }
  | { type: 'worker-error'; message: string };
