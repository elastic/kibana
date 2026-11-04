/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { ConcreteTaskInstance } from '../task';
import { TaskStatus } from '../task';
import { REMOVED_TYPES } from '../task_type_dictionary';
import { TASK_MANAGER_INDEX } from '../constants';
import { defineTaskType } from '../task_type_module';

export const MARK_REMOVED_TASKS_TASK_ID = 'mark_removed_tasks_as_unrecognized';
export const MARK_REMOVED_TASKS_TASK_TYPE = `task_manager:${MARK_REMOVED_TASKS_TASK_ID}`;
export const SCHEDULE_INTERVAL = '1h';

/** Marks tasks of types that were removed from Kibana as unrecognized. */
export const taskType = defineTaskType({
  type: MARK_REMOVED_TASKS_TASK_TYPE,
  title: 'Mark removed tasks as unrecognized',
  createTaskRunner: (_, { logger, elasticsearch }) => ({
    async run() {
      try {
        const esClient = elasticsearch.asInternalUser;

        const removedTasks = await queryForRemovedTasks(esClient);

        if (removedTasks.length > 0) {
          await updateTasksToBeUnrecognized(esClient, logger, removedTasks);
        }

        return { state: {}, schedule: { interval: SCHEDULE_INTERVAL } };
      } catch (e) {
        logger.error(`Failed to mark removed tasks as unrecognized. Error: ${e.message}`);
        return { state: {}, schedule: { interval: SCHEDULE_INTERVAL } };
      }
    },
  }),
});

async function queryForRemovedTasks(
  esClient: ElasticsearchClient
): Promise<Array<SearchHit<ConcreteTaskInstance>>> {
  const result = await esClient.search<ConcreteTaskInstance>({
    index: TASK_MANAGER_INDEX,
    size: 100,
    _source: false,
    query: {
      bool: {
        must: [
          {
            terms: {
              'task.taskType': REMOVED_TYPES,
            },
          },
        ],
      },
    },
  });

  return result.hits.hits;
}

async function updateTasksToBeUnrecognized(
  esClient: ElasticsearchClient,
  logger: Logger,
  removedTasks: Array<SearchHit<ConcreteTaskInstance>>
) {
  const bulkBody = [];
  for (const task of removedTasks) {
    bulkBody.push({ update: { _id: task._id } });
    bulkBody.push({ doc: { task: { status: TaskStatus.Unrecognized } } });
  }

  let removedCount = 0;
  try {
    const removeResults = await esClient.bulk({
      index: TASK_MANAGER_INDEX,
      refresh: false,
      body: bulkBody,
    });
    for (const removeResult of removeResults.items) {
      if (!removeResult.update || !removeResult.update._id) {
        logger.warn(
          `Error updating task with unknown to mark as unrecognized - malformed response`
        );
      } else if (removeResult.update?.error) {
        logger.warn(
          `Error updating task ${
            removeResult.update._id
          } to mark as unrecognized - ${JSON.stringify(removeResult.update.error)}`
        );
      } else {
        removedCount++;
      }
    }
    logger.debug(`Marked ${removedCount} removed tasks as unrecognized`);
  } catch (err) {
    // don't worry too much about errors, we'll try again next time
    logger.warn(`Error updating tasks to mark as unrecognized: ${err}`);
  }
}
