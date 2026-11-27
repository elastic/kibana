/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INVESTIGATION_LIMITS,
  MAX_COMMENTS_PER_TASK,
  MAX_TASKS_PER_CASE,
} from '../../../../common/investigations/constants';
import {
  PROCEDURE_PHASES,
  isTaskFinished as isStatusFinished,
} from '../../../../common/investigations/types';
import type {
  Actor,
  InvestigationItem,
  TaskItem,
  TaskOwnerType,
  TaskPriority,
  TaskStatus,
} from '../../../../common/investigations/types';
import * as i18n from './translations';

export const MAX_TASKS = MAX_TASKS_PER_CASE;
export const MAX_TASK_COMMENTS = MAX_COMMENTS_PER_TASK;
export const MAX_REASON_LENGTH = INVESTIGATION_LIMITS.maxShortTextLength;
export const MAX_ASSIGNEES = 10;

export const PHASES = PROCEDURE_PHASES;

/** What a person sees: the stored status, or waiting on another task / blocked by a claim. */
export type EffectiveTaskStatus = TaskStatus | 'waiting' | 'blocked';
export type TaskFilter = 'all' | 'mine' | 'open' | 'required';

export const OWNER_TYPES: readonly TaskOwnerType[] = ['person', 'team', 'agent', 'automation'];
export const TASK_PRIORITIES: readonly TaskPriority[] = ['low', 'medium', 'high', 'critical'];

export const OWNER_TYPE_LABELS: Record<TaskOwnerType, string> = {
  person: i18n.OWNER_PERSON,
  team: i18n.OWNER_TEAM,
  agent: i18n.OWNER_AGENT,
  automation: i18n.OWNER_AUTOMATION,
};

/**
 * The icon of the drag handle. `icons.ts` has no handle icon yet, so it lives here until it is
 * added there.
 */

export const isTaskFinished = (task: TaskItem): boolean => isStatusFinished(task.status);

/** Unfinished and past its due date (the Cases rule). */
export const isTaskOverdue = (task: TaskItem, now: number): boolean => {
  const { due_date: dueDate } = task.task;
  if (!dueDate || isTaskFinished(task)) {
    return false;
  }
  const due = Date.parse(dueDate);
  return !Number.isNaN(due) && due < now;
};

export const isSubtask = (task: TaskItem): boolean => Boolean(task.task.parent_task_id);

const bySortOrder = (a: TaskItem, b: TaskItem): number =>
  (a.task.sort_order ?? 0) - (b.task.sort_order ?? 0) ||
  a.ref.localeCompare(b.ref, undefined, { numeric: true });

export interface TaskGroup {
  root: TaskItem;
  subtasks: TaskItem[];
}

/** Roots by `sort_order`, each with its subtasks by `sort_order` (as Cases orders tasks). */
export const groupTasks = (tasks: readonly TaskItem[]): TaskGroup[] => {
  const roots = tasks.filter((task) => !isSubtask(task)).sort(bySortOrder);
  const rootIds = new Set(roots.map((root) => root.id));
  const children = new Map<string, TaskItem[]>();
  tasks.forEach((task) => {
    const parentId = task.task.parent_task_id;
    if (parentId) {
      children.set(parentId, [...(children.get(parentId) ?? []), task]);
    }
  });
  const groups = roots.map((root) => ({
    root,
    subtasks: (children.get(root.id) ?? []).sort(bySortOrder),
  }));
  // A subtask whose parent is gone is shown as a root so it stays reachable.
  const orphans = tasks.filter(
    (task) => isSubtask(task) && !rootIds.has(task.task.parent_task_id ?? '')
  );
  return [...groups, ...orphans.map((root) => ({ root, subtasks: [] }))];
};

export const sortTasks = (tasks: readonly TaskItem[]): TaskItem[] =>
  groupTasks(tasks).flatMap(({ root, subtasks }) => [root, ...subtasks]);

/** The status a person sees: waiting on another task, blocked by a claim, or the stored one. */
export const getEffectiveStatus = (
  task: TaskItem,
  tasksById: ReadonlyMap<string, TaskItem>,
  claimsById: ReadonlyMap<string, InvestigationItem>
): EffectiveTaskStatus => {
  if (isTaskFinished(task)) {
    return task.status;
  }
  const dependencyId = task.task.depends_on;
  if (dependencyId) {
    const dependency = tasksById.get(dependencyId);
    if (dependency && !isTaskFinished(dependency)) {
      return 'waiting';
    }
  }
  const { auto } = task.task;
  if (auto?.type === 'claim' && auto.claim_id) {
    const claim = claimsById.get(auto.claim_id);
    if (claim && claim.kind === 'claim' && claim.status === 'blocked') {
      return 'blocked';
    }
  }
  return task.status;
};

export const isAssignedTo = (task: TaskItem, profileUid: string | undefined): boolean =>
  Boolean(profileUid) && task.task.assignees.includes(profileUid ?? '');

export const getActorKindLabel = (actor: Actor): string =>
  actor.type === 'agent'
    ? i18n.OWNER_AGENT.toLowerCase()
    : actor.type === 'automation'
    ? i18n.OWNER_AUTOMATION.toLowerCase()
    : i18n.OWNER_PERSON.toLowerCase();

/** An owner that still needs naming: a person with no name. */
export const isOwnerUnnamed = (task: TaskItem): boolean =>
  task.task.owner.type === 'person' && !task.task.owner.id && !task.task.owner.name;

/** Whether a run of the task's workflow is going or failed. */
export const getWorkflowRunState = (
  task: TaskItem
): 'none' | 'running' | 'failed' | 'succeeded' => {
  const status = task.task.workflow_run?.status;
  return status === 'running' || status === 'failed' || status === 'succeeded' ? status : 'none';
};
