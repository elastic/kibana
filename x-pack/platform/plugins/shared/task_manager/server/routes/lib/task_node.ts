/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskDetails, TaskNode, TaskOutcomeRollup } from '../../../common/observability';
import type { ConcreteTaskInstance } from '../../task';
import { getChildTaskOutcome } from '../../task_running/fan_out';

const toIso = (date: Date | null | undefined): string | null => (date ? date.toISOString() : null);

/**
 * Projects a task document onto the wire shape of the observability routes. Never includes
 * credentials; `state` and `params` are only part of `toTaskDetails`.
 */
export const toTaskNode = (task: ConcreteTaskInstance, matched: boolean = true): TaskNode => ({
  id: task.id,
  task_type: task.taskType,
  status: task.status,
  outcome: getChildTaskOutcome(task.status),
  parent_id: task.parentId ?? null,
  root_id: task.rootId ?? null,
  depth: task.depth ?? 0,
  child_key: task.childKey ?? null,
  has_children: Boolean(task.hasChildren),
  attempts: task.attempts,
  run_at: task.runAt.toISOString(),
  scheduled_at: task.scheduledAt.toISOString(),
  started_at: toIso(task.startedAt),
  retry_at: toIso(task.retryAt),
  owner_id: task.ownerId ?? null,
  enabled: task.enabled !== false,
  recurring: Boolean(task.schedule),
  wake_requested: Boolean(task.wakeRequested),
  cancel_requested: Boolean(task.cancelRequested),
  matched,
});

export const toTaskDetails = (task: ConcreteTaskInstance): TaskDetails => ({
  ...toTaskNode(task),
  params: task.params ?? {},
  state: task.state ?? {},
  scope: task.scope ?? null,
  schedule: task.schedule ? { ...task.schedule } : null,
  timeout_override: task.timeoutOverride ?? null,
  priority: task.priority ?? null,
  space_id: task.userScope?.spaceId ?? task.credential?.spaceId ?? null,
});

export const rollupOutcomes = (nodes: TaskNode[]): TaskOutcomeRollup => {
  const rollup: TaskOutcomeRollup = {
    total: nodes.length,
    inProgress: 0,
    done: 0,
    failed: 0,
    cancelled: 0,
    missing: 0,
    unrecognized: 0,
  };
  for (const node of nodes) {
    rollup[node.outcome] += 1;
  }
  return rollup;
};
