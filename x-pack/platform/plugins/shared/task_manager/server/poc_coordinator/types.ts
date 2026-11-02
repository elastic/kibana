/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * PoC: coordination/execution seam (https://github.com/elastic/kibana — learning artifact only).
 *
 * This file defines the three-channel interface between the task COORDINATOR
 * (polling, claiming, discovery, claim-nudge) and the task EXECUTOR
 * (task pool, task runners). All channel payloads must be structured-clone
 * serializable so the same interface works in-process and over
 * worker_threads postMessage.
 *
 * Channels (see PRD "Decisions"):
 *   1. capacity$            executor -> coordinator (advisory, stale-tolerant)
 *   2. claimed task batches coordinator -> executor
 *   3. execution reports    executor -> coordinator (feeds future policy)
 */

import type { TaskManagerConfig } from '../config';

/** Minimal logger surface the coordinator needs; structurally compatible with @kbn/logging Logger. */
export interface CoordinatorLogger {
  trace(message: string): void;
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string | Error, meta?: unknown): void;
  get?(...childContext: string[]): CoordinatorLogger;
}

/**
 * Serializable snapshot of a task definition: exactly the fields coordination
 * (claiming/sorting/costing) needs. Notably NO createTaskRunner — behaviour
 * never crosses the seam, only metadata.
 */
export interface SerializedTaskTypeDefinition {
  type: string;
  cost: number;
  priority?: number;
  maxConcurrency?: number;
  maxAttempts?: number;
  timeout?: string;
}

/** Channel 1: executor -> coordinator. Advisory and stale by design. */
export interface CapacitySnapshot {
  /** Cost units available in the pool right now. */
  availableCapacity: number;
  /** Available capacity per limited-concurrency task type. */
  availableCapacityByType: Record<string, number>;
  usedCapacityPercentage: number;
  /** Runtime execution control (pause/resume) state, owned by the executor side. */
  paused: boolean;
  pausedTaskTypes: string[];
  /** Executor wall-clock when the snapshot was taken (staleness measurement). */
  takenAt: number;
}

/** A claimed task reference. The executor re-hydrates the full doc itself. */
export interface ClaimedTaskRef {
  id: string;
  taskType: string;
  /** Encoded seq_no/primary_term version AFTER the claim update. */
  version: string;
}

export interface ClaimCycleStats {
  tasksUpdated: number;
  tasksConflicted: number;
  tasksClaimed: number;
  tasksLeftUnclaimed: number;
  tasksErrors: number;
  staleTasks: number;
}

/** Channel 2: coordinator -> executor. */
export interface ClaimedTaskBatch {
  tasks: ClaimedTaskRef[];
  stats: ClaimCycleStats;
  timing?: { start: number; stop: number };
  /** Monotonic claim cycle counter (evidence/log correlation). */
  cycle: number;
}

/** Channel 3: executor -> coordinator. */
export interface ExecutionReport {
  /** 0-100; drives (future) poll interval policy. */
  tmUtilization: number;
  takenAt: number;
}

/**
 * Static context the coordinator needs besides live dependencies. All plain
 * data (postMessage-able).
 */
export interface CoordinatorContext {
  /** `kibana:<uuid>` — stamped as ownerId on claimed tasks. */
  taskManagerId: string;
  /** Bare uuid of this node (discovery doc id / partitioning pod name). */
  podName: string;
  taskIndex: string;
  claimNudgeIndex: string;
  isServerless: boolean;
  definitions: SerializedTaskTypeDefinition[];
  startingCapacity: number;
  excludedTaskTypes: string[];
}

/* --------------------------------------------------------------------------
 * Worker transport protocol (channels mapped onto postMessage)
 * ------------------------------------------------------------------------ */

export type ExecutorToCoordinatorMessage =
  | { kind: 'capacity'; snapshot: CapacitySnapshot }
  | { kind: 'execution-report'; report: ExecutionReport }
  | { kind: 'start' }
  | { kind: 'shutdown' };

export type CoordinatorToExecutorMessage =
  | { kind: 'started' }
  | { kind: 'claimed-batch'; batch: ClaimedTaskBatch }
  | { kind: 'claim-cycle-failed'; error: string }
  | { kind: 'fatal'; error: string };

/** workerData passed to the coordinator worker at boot. */
export interface CoordinatorWorkerData {
  config: TaskManagerConfig;
  context: CoordinatorContext;
  es: {
    node: string;
    username?: string;
    password?: string;
    serviceAccountToken?: string;
    /** PEM file paths; the worker reads them itself. */
    caPaths?: string[];
    rejectUnauthorized?: boolean;
  };
  /** Optional side-channel log file, written with sync fs so logs survive a blocked main thread. */
  logFilePath?: string;
}
