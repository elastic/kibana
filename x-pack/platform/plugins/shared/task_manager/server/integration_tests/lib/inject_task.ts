/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import murmurhash from 'murmurhash';
import { type ElasticsearchClient } from '@kbn/core/server';
import { type ConcreteTaskInstance } from '../../task';
import { MAX_PARTITIONS } from '../../lib/task_partitioner';

export async function injectTask(
  esClient: ElasticsearchClient,
  { id, ...task }: ConcreteTaskInstance
) {
  const soId = `task:${id}`;
  await esClient.index({
    id: soId,
    index: '.kibana_task_manager',
    document: {
      references: [],
      type: 'task',
      updated_at: new Date().toISOString(),
      task: {
        ...task,
        state: JSON.stringify(task.state),
        params: JSON.stringify(task.params),
        runAt: task.runAt.toISOString(),
        scheduledAt: task.scheduledAt.toISOString(),
        partition: murmurhash.v3(id) % MAX_PARTITIONS,
      },
    },
  });
}

export async function injectTaskBulk(esClient: ElasticsearchClient, tasks: ConcreteTaskInstance[]) {
  const bulkRequest = [];
  for (const task of tasks) {
    bulkRequest.push({ create: { _id: `task:${task.id}` } });
    bulkRequest.push({
      references: [],
      type: 'task',
      updated_at: new Date().toISOString(),
      task: {
        ...task,
        state: JSON.stringify(task.state),
        params: JSON.stringify(task.params),
        runAt: task.runAt.toISOString(),
        scheduledAt: task.scheduledAt.toISOString(),
        partition: murmurhash.v3(task.id) % MAX_PARTITIONS,
      },
    });
  }
  await esClient.bulk({
    index: '.kibana_task_manager',
    body: bulkRequest,
  });
}
