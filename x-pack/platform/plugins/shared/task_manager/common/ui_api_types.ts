/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The time range of the run history, as ISO 8601 dates. */
export interface TaskRunsWindow {
  start: string;
  end: string;
}

export interface TaskTypeDefinitionSummary {
  title?: string;
  description?: string;
  timeout: string;
  max_attempts: number;
  max_concurrency?: number;
  cost: number;
  priority?: number;
  /** Set by the alerting and actions frameworks for the task types they register. */
  task_type_group?: string;
}

export interface TaskRunsSummary {
  success: number;
  failure: number;
  /** Distinct tasks with at least one failed run, including one-time tasks removed since. */
  failed_tasks: number;
  avg_duration_ms?: number;
  p95_duration_ms?: number;
  last_failure?: {
    at: string;
    task_id?: string;
    message?: string;
  };
}

export interface TaskTypeSummary {
  task_type: string;
  registered: boolean;
  tasks: number;
  overdue: number;
  by_status: Record<string, number>;
  definition?: TaskTypeDefinitionSummary;
  runs?: TaskRunsSummary;
}

export interface TaskManagerUiOverviewResponse {
  generated_at: string;
  window: TaskRunsWindow;
  event_log_available: boolean;
  totals: {
    tasks: number;
    overdue: number;
    by_status: Record<string, number>;
  };
  nodes: Array<{ id: string; last_seen: string }>;
  execution_control: {
    paused: boolean;
    paused_task_types: string[];
  };
  excluded_task_types: string[];
  task_types: TaskTypeSummary[];
}

export interface TaskSummary {
  id: string;
  task_type: string;
  status: string;
  enabled: boolean;
  run_at?: string;
  scheduled_at?: string;
  started_at?: string | null;
  retry_at?: string | null;
  attempts: number;
  schedule?: { interval?: string; rrule?: Record<string, unknown> };
  owner_id?: string | null;
  partition?: number;
  priority?: number;
}

export interface TaskLastRun {
  at: string;
  outcome?: string;
  error_message?: string;
}

interface TaskListItemBase {
  last_run?: TaskLastRun;
  /** The latest failed run in the selected window, which can be older than the last run. */
  last_failure?: TaskLastRun;
}

export interface StoredTaskListItem extends TaskSummary, TaskListItemBase {
  removed: false;
}

/** A task that no longer exists, listed because it failed in the selected window. */
export interface RemovedTaskListItem
  extends Pick<TaskSummary, 'id' | 'task_type'>,
    TaskListItemBase {
  removed: true;
}

export type TaskListItem = StoredTaskListItem | RemovedTaskListItem;

export interface TaskManagerUiTaskListResponse {
  page: number;
  per_page: number;
  /**
   * Stored tasks plus removed tasks that failed in the window, which are listed last.
   * With the failed in window status filter, only tasks that failed in the window, latest failure first.
   */
  total: number;
  tasks: TaskListItem[];
}

export type TaskExplanationVerdict = 'ok' | 'attention' | 'blocked';

export type TaskExplanationReason =
  | { code: 'type_not_registered' }
  | { code: 'unrecognized' }
  | { code: 'type_excluded' }
  | { code: 'execution_paused' }
  | { code: 'task_type_paused' }
  | { code: 'disabled' }
  | { code: 'failed'; attempts: number; max_attempts: number }
  | { code: 'dead_letter' }
  | { code: 'should_delete' }
  | { code: 'running'; owner_id?: string | null; retry_at?: string | null }
  | { code: 'stuck'; owner_id?: string | null; retry_at: string }
  | { code: 'scheduled'; run_at: string }
  | { code: 'due'; run_at: string }
  | { code: 'overdue'; run_at: string; overdue_ms: number }
  | { code: 'removed' }
  | {
      code: 'last_run_failed';
      consecutive_failures: number;
      runs_checked: number;
      failed_at: string;
      error_message?: string;
    };

export interface TaskExplanation {
  verdict: TaskExplanationVerdict;
  reasons: TaskExplanationReason[];
}

export interface TaskRun {
  timestamp: string;
  outcome?: string;
  duration_ms?: number;
  schedule_delay_ms?: number;
  message?: string;
  error_message?: string;
  node_id?: string;
  execution_uuid?: string;
}

export interface TaskFailuresInWindow {
  window: TaskRunsWindow;
  count: number;
  last_failure: TaskLastRun;
}

export interface TaskManagerUiTaskDetailResponse {
  /** Absent when the task was removed and only its run history remains in the event log. */
  task?: TaskSummary & { scope?: string[]; timeout_override?: string };
  task_type: string;
  definition?: TaskTypeDefinitionSummary;
  explanation: TaskExplanation;
  event_log_available: boolean;
  recent_runs: TaskRun[];
  /** Absent when the task did not fail in the selected window. Its failures can be older than the recent runs. */
  failures_in_window?: TaskFailuresInWindow;
}
