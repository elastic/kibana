/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';

import { BulkActionTaskType } from './bulk_action_types';

export const MAX_RETRY_COUNT = 20;

/**
 * Raised when Elasticsearch rejects the `search_after` cursor a run resumed from, as opposed to
 * any other bad request. Only the first search of a run can raise it: every later page searches
 * with a cursor Elasticsearch has just handed back, and a batch's own writes raise ordinary
 * errors.
 */
export class RejectedCheckpointError extends Error {
  constructor(public readonly cause: Error) {
    super(cause.message);
    this.name = 'RejectedCheckpointError';
  }
}

/** How often the check task wakes up to verify that the action is still making progress. */
export const CHECK_TASK_INTERVAL_MINUTES = 5;

/**
 * How often a running runner refreshes `checkpointUpdatedAt` while a batch is in flight. It has
 * to be comfortably below CHECK_TASK_INTERVAL_MINUTES so that there is always at least one
 * refresh between two consecutive check task runs, otherwise a live runner still looks dead.
 */
export const RUNNER_HEARTBEAT_INTERVAL_MINUTES = 2;

/**
 * Upper bound on how many times the check task may restart a stalled runner before giving up,
 * so a permanently failing action cannot be resumed forever.
 */
export const MAX_CHECK_TASK_RESUMES = 20;

export interface RetryParams {
  pitId?: string;
  searchAfter?: SortResults;
  retryCount?: number;
  taskId?: string;
  /** Agents processed by earlier runs of this action, so the count stays cumulative. */
  nbAgentsProcessed?: number;
}

/**
 * State of the recurring check task that watches over a bulk action runner.
 *
 * `searchAfter` / `pitId` / `nbAgentsProcessed` / `checkpointUpdatedAt` are written by the runner;
 * `lastObservedCheckpointAt` / `resumeCount` are written by the check task itself.
 */
export interface BulkActionCheckTaskState {
  searchAfter?: SortResults;
  /**
   * The point in time the cursor was taken under. Elasticsearch may return a new id on any
   * search, and only the latest is guaranteed valid, so it is checkpointed with the cursor.
   */
  pitId?: string;
  nbAgentsProcessed?: number;
  /**
   * Last time the runner wrote to this state, either by advancing past a batch or by a heartbeat
   * while one was in flight. Its only use is liveness: the check task resumes the action when it
   * has not moved since the previous run.
   *
   * Its presence is also what tells a cleared checkpoint apart from one that was never written:
   * once the runner has stamped it, the checkpoint in the task's params is stale by definition
   * and must not be read as a fallback.
   */
  checkpointUpdatedAt?: string;
  lastObservedCheckpointAt?: string;
  resumeCount?: number;
}

export function getRetryParams(taskType: string, retryParams: RetryParams): RetryParams {
  // update tags will retry with tags filter
  return taskType === BulkActionTaskType.UPDATE_AGENT_TAGS_RETRY
    ? {
        ...retryParams,
        pitId: undefined,
        searchAfter: undefined,
      }
    : retryParams;
}
