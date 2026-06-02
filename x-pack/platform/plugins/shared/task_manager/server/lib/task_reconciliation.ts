/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import { TaskStatus } from '../task';
import type { ConcreteTaskInstance } from '../task';
import type { TaskStore } from '../task_store';

const DEFAULT_MAX_TASKS_TO_RECONCILE = 10000;

export interface StartupTaskReconciliationResult {
  recoveredTasks: ConcreteTaskInstance[];
  updated: number;
  limitedByMaxTasks: boolean;
}

interface ReconcileTasksOnStartupOpts {
  taskStore: TaskStore;
  logger: Logger;
  now?: Date;
  maxTasksToReconcile?: number;
}

export async function reconcileTasksOnStartup({
  taskStore,
  logger,
  now = new Date(),
  maxTasksToReconcile = DEFAULT_MAX_TASKS_TO_RECONCILE,
}: ReconcileTasksOnStartupOpts): Promise<StartupTaskReconciliationResult> {
  const { docs: recoveredTasks } = await taskStore.fetch({
    query: getOwnedRunningOrClaimingTasksQuery(taskStore.taskManagerId),
    size: maxTasksToReconcile,
    sort: [{ 'task.runAt': 'asc' }],
  });

  if (recoveredTasks.length === 0) {
    logger.debug('No tasks to reconcile on startup.');
    return { recoveredTasks, updated: 0, limitedByMaxTasks: false };
  }

  const limitedByMaxTasks = recoveredTasks.length >= maxTasksToReconcile;

  if (limitedByMaxTasks) {
    logger.warn(
      `Startup reconciliation found at least ${maxTasksToReconcile} tasks; this run reconciles only the first ${maxTasksToReconcile}. Consider increasing the reconciliation limit.`
    );
  }

  for (const task of recoveredTasks) {
    logger.info(
      `Recovered task [${task.id}] of type [${task.taskType}] (status: [${
        task.status
      }], startedAt: [${
        task.startedAt?.toISOString() ?? 'null'
      }], runAt: [${task.runAt.toISOString()}]).`
    );
  }

  logger.info(
    `Recovered ${recoveredTasks.length} task(s) that were owned by [${taskStore.taskManagerId}] from a previous run.`
  );

  const recoveredTaskTypes = Object.entries(
    recoveredTasks.reduce<Record<string, number>>((acc, task) => {
      acc[task.taskType] = (acc[task.taskType] ?? 0) + 1;
      return acc;
    }, {})
  )
    .sort(([leftType], [rightType]) => leftType.localeCompare(rightType))
    .map(([taskType, count]) => `${taskType} x ${count}`)
    .join(', ');

  logger.info(
    `Reconciled ${recoveredTasks.length} task(s) from previous node run: ${recoveredTaskTypes}.`
  );

  const updateResult = await taskStore.updateByQuery({
    query: getTasksByIdQuery(recoveredTasks.map(({ id }) => id)),
    script: {
      lang: 'painless',
      source:
        'ctx._source.task.status = params.status; ctx._source.task.ownerId = null; ctx._source.task.startedAt = null; ctx._source.task.retryAt = null; ctx._source.task.scheduledAt = params.scheduledAt;',
      params: {
        status: TaskStatus.Idle,
        scheduledAt: now.toISOString(),
      },
    },
  });

  return {
    recoveredTasks,
    updated: updateResult.updated,
    limitedByMaxTasks,
  };
}

function getOwnedRunningOrClaimingTasksQuery(
  taskManagerId: string
): estypes.QueryDslQueryContainer {
  return {
    bool: {
      must: [
        { term: { 'task.ownerId': taskManagerId } },
        {
          bool: {
            should: [
              { term: { 'task.status': TaskStatus.Running } },
              { term: { 'task.status': TaskStatus.Claiming } },
            ],
            minimum_should_match: 1,
          },
        },
      ],
    },
  };
}

function getTasksByIdQuery(taskIds: string[]): estypes.QueryDslQueryContainer {
  return {
    bool: {
      must: [{ ids: { values: taskIds.map((taskId) => `task:${taskId}`) } }],
    },
  };
}
