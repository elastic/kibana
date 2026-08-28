/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { chunk } from 'lodash';
import { TaskStatus } from '../task';
import type { PartialConcreteTaskInstance } from '../task';
import type { TaskStore } from '../task_store';
import { isOk } from './result_type';
import { mustBeAllOf, shouldBeOneOf } from '../queries/query_clauses';

export const MAX_TASKS_TO_RESET = 10_000;
const RESET_BATCH_SIZE = 100;

interface ResetInFlightTasksOpts {
  logger: Logger;
  taskStore: TaskStore;
}

/**
 * Resets tasks that are still marked as owned by this Kibana node from a
 * previous run (e.g. after a crash or unclean shutdown) so they become
 * immediately claimable, instead of remaining unavailable until their
 * `retryAt` timeout expires.
 *
 * Best-effort: never rejects. On failure the error is logged and the normal
 * `retryAt` timeout path remains the safety net.
 */
export async function resetInFlightTasksOwnedByThisNode({
  logger,
  taskStore,
}: ResetInFlightTasksOpts): Promise<void> {
  try {
    const { docs } = await taskStore.fetch(
      {
        query: mustBeAllOf(
          { term: { 'task.ownerId': taskStore.taskManagerId } },
          shouldBeOneOf(
            { term: { 'task.status': TaskStatus.Running } },
            { term: { 'task.status': TaskStatus.Claiming } }
          )
        ),
        size: MAX_TASKS_TO_RESET,
        seq_no_primary_term: true,
      },
      true
    );

    if (docs.length === 0) {
      logger.debug('No in-flight tasks from a previous run to reset');
      return;
    }

    if (docs.length >= MAX_TASKS_TO_RESET) {
      logger.warn(
        `Found at least ${MAX_TASKS_TO_RESET} in-flight tasks from a previous run; only the first ${MAX_TASKS_TO_RESET} will be reset, the rest will be picked up once their retry timeout expires`
      );
    }

    const tasksById = new Map(docs.map((task) => [task.id, task]));
    const now = new Date();
    const updates: PartialConcreteTaskInstance[] = docs.map((task) => ({
      id: task.id,
      // optimistic concurrency: if another node claimed this task in the
      // meantime (possible when its retryAt already expired), the update
      // conflicts with a 409 and is skipped
      version: task.version,
      status: TaskStatus.Idle,
      ownerId: null,
      startedAt: null,
      retryAt: null,
      scheduledAt: now,
      // `attempts` is intentionally left untouched: it was already
      // incremented when this node claimed the task, so the interrupted run
      // is counted, matching the `retryAt` timeout recovery path
    }));

    const resetCountsByType: Record<string, number> = {};
    let resetCount = 0;
    let conflictCount = 0;
    let errorCount = 0;

    for (const batch of chunk(updates, RESET_BATCH_SIZE)) {
      const results = await taskStore.bulkPartialUpdate(batch);
      for (const result of results) {
        if (isOk(result)) {
          const task = tasksById.get(result.value.id);
          const taskType = task?.taskType ?? 'unknown';
          logger.info(
            `Reset in-flight task "${result.value.id}" of type "${taskType}" from status "${task?.status}" to "idle" following an unclean shutdown`
          );
          resetCountsByType[taskType] = (resetCountsByType[taskType] ?? 0) + 1;
          resetCount++;
        } else {
          const { id, status, error } = result.error;
          if (status === 409) {
            // the task was claimed by another node between our fetch and
            // update; leave it alone
            conflictCount++;
          } else {
            logger.error(
              `Error resetting in-flight task "${id}" following an unclean shutdown: ${JSON.stringify(
                error
              )}`
            );
            errorCount++;
          }
        }
      }
    }

    const summaryByType = Object.entries(resetCountsByType)
      .sort(([leftType], [rightType]) => leftType.localeCompare(rightType))
      .map(([taskType, count]) => `${taskType}: ${count}`)
      .join(', ');
    logger.info(
      `Reset ${resetCount} in-flight task(s) owned by this node following an unclean shutdown (${summaryByType}); skipped ${conflictCount} task(s) claimed by another node; failed to reset ${errorCount} task(s)`
    );
  } catch (e) {
    logger.error(
      `Failed to reset in-flight tasks owned by this node following an unclean shutdown: ${e.message}`
    );
  }
}
