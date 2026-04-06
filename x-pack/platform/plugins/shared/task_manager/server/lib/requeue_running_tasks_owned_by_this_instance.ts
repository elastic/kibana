/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encodeVersion } from '@kbn/core-saved-objects-base-server-internal';
import type { Logger } from '@kbn/core/server';
import type { TaskStore } from '../task_store';
import { TaskStatus } from '../task';
import { isErr, isOk } from './result_type';

interface RequeueRunningTasksOpts {
  taskStore: TaskStore;
  logger: Logger;
}

/**
 * Requeues tasks left in "running" or "claiming" by this Kibana instance after an unclean
 * shutdown (e.g. OOM). With a stable instance UUID, matching ownerId + running/claiming means
 * no process is executing them.
 *
 * Fetches matching tasks (logging per-task details for OOM diagnostics), then bulk-updates them
 * to idle. Version conflicts are skipped — they mean another writer already updated the task.
 *
 * Called once by `TaskPollingLifecycle` on the first poll cycle.
 */
export const requeueRunningTasksOwnedByThisInstance = async ({
  taskStore,
  logger,
}: RequeueRunningTasksOpts): Promise<void> => {
  try {
    const { docs: tasks, versionMap } = await taskStore.fetch(
      {
        query: {
          bool: {
            must: [
              { term: { 'task.ownerId': taskStore.taskManagerId } },
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
        },
        size: 1000,
        seq_no_primary_term: true,
      },
      true
    );

    if (tasks.length === 0) {
      return;
    }

    logger.warn(
      `Found ${tasks.length} running/claiming task(s) after unclean shutdown (ownerId: ${taskStore.taskManagerId})`
    );
    for (const task of tasks) {
      logger.warn(
        `  Task to requeue: id="${task.id}", type="${task.taskType}", status="${task.status}", ` +
          `attempts=${task.attempts}, ` +
          `runAt="${task.runAt.toISOString()}", ` +
          `startedAt="${task.startedAt?.toISOString() ?? 'N/A'}", ` +
          `retryAt="${task.retryAt?.toISOString() ?? 'N/A'}"`
      );
    }

    const updates = tasks
      .map((task) => {
        const v = versionMap.get(task.id);
        if (v?.seqNo == null || v?.primaryTerm == null) {
          logger.warn(`Skipping requeue for task "${task.id}": missing version info from search`);
          return undefined;
        }
        return {
          id: task.id,
          version: encodeVersion(v.seqNo, v.primaryTerm),
          status: TaskStatus.Idle as TaskStatus,
          startedAt: null,
          retryAt: null,
          ownerId: null,
          scheduledAt: task.runAt,
        };
      })
      .filter((u) => u !== undefined);

    if (updates.length === 0) {
      return;
    }

    const results = await taskStore.bulkPartialUpdate(updates);

    let requeued = 0;
    let conflicts = 0;
    for (const result of results) {
      if (isOk(result)) {
        requeued++;
      } else if (isErr(result) && result.error.status === 409) {
        conflicts++;
      } else if (isErr(result)) {
        logger.error(
          `Requeue failed for task "${result.error.id}": ${JSON.stringify(result.error.error)}`
        );
      }
    }

    if (requeued > 0) {
      logger.info(`Requeued ${requeued} task(s) to idle for immediate claiming`);
    }
    if (conflicts > 0) {
      logger.info(`${conflicts} task(s) skipped due to version conflict`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to requeue running tasks: ${message}`);
  }
};
