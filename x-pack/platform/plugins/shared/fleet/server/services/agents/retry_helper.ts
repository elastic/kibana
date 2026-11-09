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

/**
 * Absolute ceiling on how many times the check task may run for one action, whatever it observes.
 * `MAX_CHECK_TASK_RESUMES` only bounds the paths that resume, and a runner wedged inside
 * `processAgents` keeps heartbeating, so it looks alive forever and never trips that limit. This
 * stops the watchdog outliving any plausible action: 24 hours at the default interval, against an
 * action the issue measures in minutes at 100k agents.
 */
export const MAX_CHECK_TASK_RUNS = (24 * 60) / CHECK_TASK_INTERVAL_MINUTES;

/**
 * Ceiling on the child action ids carried in the checkpoint. Rollback writes one action per
 * rollback version per batch, so a large fleet paged with a small `batchSize` could otherwise grow
 * this list without bound inside a saved object. The earliest ids are the ones kept, since an
 * action restarting from the beginning re-pages their agents first; past the ceiling such an action
 * deduplicates the agents it has ids for and re-actions the rest, as it did before they were
 * recorded at all.
 */
export const MAX_CHILD_ACTION_IDS = 1000;

export interface RetryParams {
  pitId?: string;
  searchAfter?: SortResults;
  retryCount?: number;
  taskId?: string;
  /** Agents processed by earlier runs of this action, so the count stays cumulative. */
  nbAgentsProcessed?: number;
  /**
   * Action ids earlier runs of this action wrote their documents under, when they are not the
   * action's own id. Only rollback does this — it creates one action per rollback version — and
   * without carrying them the per-agent deduplication has nothing to read for that action type.
   */
  childActionIds?: string[];
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
   * Action ids this action's documents were written under when they are not the action's own id,
   * so a resumed run can still deduplicate against them. See `RetryParams.childActionIds`.
   */
  childActionIds?: string[];
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
  /**
   * Set by a runner that has spent its whole retry budget. Removing the check task is what should
   * follow, but that write is best effort, so this is what a surviving check task reads to stop
   * rather than resuming the action and granting it a second budget.
   */
  stoppedAt?: string;
  /** How many times the check task has run for this action, bounded by MAX_CHECK_TASK_RUNS. */
  runCount?: number;
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
