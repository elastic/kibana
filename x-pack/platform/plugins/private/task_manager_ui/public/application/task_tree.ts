/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskNode, TaskOutcomeRollup } from '@kbn/task-manager-plugin/common';

export interface TaskRow {
  task: TaskNode;
  /** Nesting level in the rendered tree; 0 for a root or an orphan. */
  level: number;
  children: TaskRow[];
  /** Outcomes of every descendant, for parents. */
  rollup: TaskOutcomeRollup | null;
}

const emptyRollup = (): TaskOutcomeRollup => ({
  total: 0,
  inProgress: 0,
  done: 0,
  failed: 0,
  cancelled: 0,
  missing: 0,
  unrecognized: 0,
});

const byRunAtDesc = (a: TaskNode, b: TaskNode) => b.run_at.localeCompare(a.run_at);
const byChildKey = (a: TaskNode, b: TaskNode) =>
  (a.child_key ?? a.id).localeCompare(b.child_key ?? b.id, undefined, { numeric: true });

/**
 * Groups a flat task list into trees. A sub-task whose parent is not in the list becomes a root
 * of its own (an orphan), so nothing is hidden.
 */
export const buildTaskRows = (tasks: TaskNode[]): TaskRow[] => {
  const ids = new Set(tasks.map(({ id }) => id));
  const childrenOf = new Map<string, TaskNode[]>();
  const roots: TaskNode[] = [];

  for (const task of tasks) {
    if (task.parent_id && ids.has(task.parent_id)) {
      const siblings = childrenOf.get(task.parent_id) ?? [];
      siblings.push(task);
      childrenOf.set(task.parent_id, siblings);
    } else {
      roots.push(task);
    }
  }

  const toRow = (task: TaskNode, level: number): TaskRow => {
    const children = (childrenOf.get(task.id) ?? [])
      .sort(byChildKey)
      .map((child) => toRow(child, level + 1));
    if (!children.length) {
      return { task, level, children, rollup: null };
    }
    const rollup = emptyRollup();
    for (const child of children) {
      rollup.total += 1 + (child.rollup?.total ?? 0);
      rollup[child.task.outcome] += 1;
      if (child.rollup) {
        for (const outcome of [
          'inProgress',
          'done',
          'failed',
          'cancelled',
          'missing',
          'unrecognized',
        ] as const) {
          rollup[outcome] += child.rollup[outcome];
        }
      }
    }
    return { task, level, children, rollup };
  };

  return roots.sort(byRunAtDesc).map((root) => toRow(root, 0));
};
