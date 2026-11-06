/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';

import { BulkActionTaskType } from './bulk_action_types';

export const MAX_RETRY_COUNT = 20;

/** How often the check task wakes up to verify that the action is still making progress. */
export const CHECK_TASK_INTERVAL_MINUTES = 5;

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
  /**
   * Set once an action has been restarted from the beginning because Elasticsearch rejected its
   * saved cursor. `processBatch` identifies an already actioned batch by its first agent, which
   * only identifies a batch while batch boundaries are stable; a restart under a different sort
   * moves them, so a new batch could share its first agent with an old one while also holding
   * agents that were never actioned. The guard is therefore dropped for the rest of the action,
   * which is consistent with a restart re-actioning agents anyway.
   */
  skipBatchDedupe?: boolean;
}

/**
 * State of the recurring check task that watches over a bulk action runner.
 *
 * `searchAfter` / `nbAgentsProcessed` / `checkpointUpdatedAt` are written by the runner after
 * every batch; `lastObservedCheckpointAt` / `resumeCount` are written by the check task itself.
 */
export interface BulkActionCheckTaskState {
  searchAfter?: SortResults;
  /**
   * The point in time the cursor was taken under. Elasticsearch may return a new id on any
   * search, and only the latest is guaranteed valid, so it is checkpointed with the cursor.
   */
  pitId?: string;
  nbAgentsProcessed?: number;
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
