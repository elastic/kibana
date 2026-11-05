/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskExplanation, TaskExplanationReason, TaskRun, TaskSummary } from '../../../common';
import { EventLogOutcomes } from '../../constants';
import { TaskStatus } from '../../task';
import { isTaskTypeExcluded } from '../../task_claimers';

export interface ExplainTaskContext {
  now: Date;
  isRegistered: boolean;
  maxAttempts: number;
  excludedTaskTypes: string[];
  executionPaused: boolean;
  pausedTaskTypes: string[];
  /** A task due within this window is waiting for the next claim cycle, not overdue. */
  dueGracePeriodMs: number;
  /** Most recent run first. */
  recentRuns: TaskRun[];
}

const isFailedRun = ({ outcome }: TaskRun): boolean => outcome === EventLogOutcomes.failure;

const getLastRunFailure = (recentRuns: TaskRun[]): TaskExplanationReason | undefined => {
  const [lastRun] = recentRuns;
  if (!lastRun || !isFailedRun(lastRun)) {
    return undefined;
  }
  const firstNonFailedRunIndex = recentRuns.findIndex((run) => !isFailedRun(run));
  return {
    code: 'last_run_failed',
    consecutive_failures:
      firstNonFailedRunIndex === -1 ? recentRuns.length : firstNonFailedRunIndex,
    runs_checked: recentRuns.length,
    failed_at: lastRun.timestamp,
    ...(lastRun.error_message ? { error_message: lastRun.error_message } : {}),
  };
};

const getBlockers = (task: TaskSummary, context: ExplainTaskContext): TaskExplanationReason[] => {
  const blockers: TaskExplanationReason[] = [];

  if (task.status === TaskStatus.Unrecognized) {
    blockers.push({ code: 'unrecognized' });
  } else if (!context.isRegistered) {
    blockers.push({ code: 'type_not_registered' });
  }
  if (isTaskTypeExcluded(context.excludedTaskTypes, task.task_type)) {
    blockers.push({ code: 'type_excluded' });
  }
  if (context.executionPaused) {
    blockers.push({ code: 'execution_paused' });
  }
  if (isTaskTypeExcluded(context.pausedTaskTypes, task.task_type)) {
    blockers.push({ code: 'task_type_paused' });
  }
  if (!task.enabled) {
    blockers.push({ code: 'disabled' });
  }
  if (task.status === TaskStatus.Failed) {
    blockers.push({ code: 'failed', attempts: task.attempts, max_attempts: context.maxAttempts });
  }
  if (task.status === TaskStatus.DeadLetter) {
    blockers.push({ code: 'dead_letter' });
  }
  if (task.status === TaskStatus.ShouldDelete) {
    blockers.push({ code: 'should_delete' });
  }

  return blockers;
};

const explainRunningTask = (task: TaskSummary, now: number): TaskExplanation => {
  const retryAt = task.retry_at ? Date.parse(task.retry_at) : undefined;
  if (task.retry_at && retryAt !== undefined && retryAt <= now) {
    return {
      verdict: 'attention',
      reasons: [{ code: 'stuck', owner_id: task.owner_id, retry_at: task.retry_at }],
    };
  }
  return {
    verdict: 'ok',
    reasons: [{ code: 'running', owner_id: task.owner_id, retry_at: task.retry_at }],
  };
};

const explainIdleTask = (
  task: TaskSummary,
  now: number,
  dueGracePeriodMs: number
): TaskExplanation => {
  if (!task.run_at) {
    return { verdict: 'ok', reasons: [] };
  }
  const overdueMs = now - Date.parse(task.run_at);
  if (overdueMs < 0) {
    return { verdict: 'ok', reasons: [{ code: 'scheduled', run_at: task.run_at }] };
  }
  if (overdueMs <= dueGracePeriodMs) {
    return { verdict: 'ok', reasons: [{ code: 'due', run_at: task.run_at }] };
  }
  return {
    verdict: 'attention',
    reasons: [{ code: 'overdue', run_at: task.run_at, overdue_ms: overdueMs }],
  };
};

const explainSchedule = (task: TaskSummary, context: ExplainTaskContext): TaskExplanation => {
  const now = context.now.getTime();
  if (task.status === TaskStatus.Running || task.status === TaskStatus.Claiming) {
    return explainRunningTask(task, now);
  }
  if (task.status === TaskStatus.Idle) {
    return explainIdleTask(task, now, context.dueGracePeriodMs);
  }
  return { verdict: 'ok', reasons: [] };
};

/**
 * Explains why a task is (or is not) going to run, mirroring the conditions of the claim query,
 * and flags a task whose most recent run failed.
 */
export const explainTask = (task: TaskSummary, context: ExplainTaskContext): TaskExplanation => {
  const lastRunFailure = getLastRunFailure(context.recentRuns);
  const blockers = getBlockers(task, context);
  if (blockers.length > 0) {
    return {
      verdict: 'blocked',
      reasons: lastRunFailure ? [...blockers, lastRunFailure] : blockers,
    };
  }

  const scheduleExplanation = explainSchedule(task, context);
  if (!lastRunFailure) {
    return scheduleExplanation;
  }
  return { verdict: 'attention', reasons: [lastRunFailure, ...scheduleExplanation.reasons] };
};

/** Explains a task that no longer exists, using the run history left in the event log. */
export const explainRemovedTask = (recentRuns: TaskRun[]): TaskExplanation => {
  const removed: TaskExplanationReason = { code: 'removed' };
  const lastRunFailure = getLastRunFailure(recentRuns);
  return lastRunFailure
    ? { verdict: 'attention', reasons: [removed, lastRunFailure] }
    : { verdict: 'ok', reasons: [removed] };
};
