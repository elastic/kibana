/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Shapes shared by the internal task-observability routes and the "Background tasks" page.
 */

export const TASKS_ROUTE = '/internal/task_manager/_tasks';
export const TASK_ROUTE = '/internal/task_manager/_task';
export const TASK_TREE_ROUTE = '/internal/task_manager/_tree';
export const TASK_TYPES_ROUTE = '/internal/task_manager/_task_types';

export const MAX_TASKS_PAGE_SIZE = 1000;

/**
 * Coarse outcome derived from a task's status. `missing` is only used by parents for a child
 * document they expect but cannot find.
 */
export type TaskOutcome =
  | 'inProgress'
  | 'done'
  | 'failed'
  | 'cancelled'
  | 'missing'
  | 'unrecognized';

export interface TaskNode {
  id: string;
  task_type: string;
  status: string;
  outcome: TaskOutcome;
  parent_id: string | null;
  root_id: string | null;
  depth: number;
  child_key: string | null;
  has_children: boolean;
  attempts: number;
  run_at: string;
  scheduled_at: string;
  started_at: string | null;
  retry_at: string | null;
  owner_id: string | null;
  enabled: boolean;
  recurring: boolean;
  wake_requested: boolean;
  cancel_requested: boolean;
  /** False for tasks returned only to complete a tree the filter matched. */
  matched: boolean;
}

export interface TaskDetails extends TaskNode {
  params: Record<string, unknown>;
  state: Record<string, unknown>;
  scope: string[] | null;
  schedule: Record<string, unknown> | null;
  timeout_override: string | null;
  priority: number | null;
  space_id: string | null;
}

export interface ListTasksResponse {
  tasks: TaskNode[];
  /** Tasks that matched the filter, before tree completion. */
  matched: number;
  truncated: boolean;
}

export interface GetTaskResponse {
  task: TaskDetails;
}

export interface TaskTypesResponse {
  task_types: string[];
}

export type TaskOutcomeRollup = Record<TaskOutcome, number> & { total: number };

export interface TaskTreeResponse {
  root_id: string;
  nodes: TaskNode[];
  rollup: TaskOutcomeRollup;
}
