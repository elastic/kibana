/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { AnalyticsIndex } from '../analytics_index';
import {
  CAI_COMMENTS_INDEX_NAME,
  CAI_COMMENTS_INDEX_ALIAS,
  CAI_COMMENTS_INDEX_VERSION,
  CAI_COMMENTS_SOURCE_INDEX,
  CAI_COMMENTS_SOURCE_QUERY,
  CAI_COMMENTS_BACKFILL_TASK_ID,
  CAI_COMMENTS_SYNCHRONIZATION_TASK_ID,
} from './constants';
import { CAI_COMMENTS_INDEX_MAPPINGS } from './mappings';
import { CAI_COMMENTS_INDEX_SCRIPT, CAI_COMMENTS_INDEX_SCRIPT_ID } from './painless_scripts';
import { scheduleCAISynchronizationTask } from '../tasks/synchronization_task';

export const createCommentsAnalyticsIndex = ({
  esClient,
  logger,
  isServerless,
  taskManager,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  isServerless: boolean;
  taskManager: TaskManagerStartContract;
}): AnalyticsIndex =>
  new AnalyticsIndex({
    logger,
    esClient,
    isServerless,
    taskManager,
    indexName: CAI_COMMENTS_INDEX_NAME,
    indexAlias: CAI_COMMENTS_INDEX_ALIAS,
    indexVersion: CAI_COMMENTS_INDEX_VERSION,
    mappings: CAI_COMMENTS_INDEX_MAPPINGS,
    painlessScriptId: CAI_COMMENTS_INDEX_SCRIPT_ID,
    painlessScript: CAI_COMMENTS_INDEX_SCRIPT,
    taskId: CAI_COMMENTS_BACKFILL_TASK_ID,
    sourceIndex: CAI_COMMENTS_SOURCE_INDEX,
    sourceQuery: CAI_COMMENTS_SOURCE_QUERY,
  });

export const scheduleCommentsAnalyticsSyncTask = ({
  taskManager,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
}) => {
  scheduleCAISynchronizationTask({
    taskId: CAI_COMMENTS_SYNCHRONIZATION_TASK_ID,
    sourceIndex: CAI_COMMENTS_SOURCE_INDEX,
    destIndex: CAI_COMMENTS_INDEX_NAME,
    taskManager,
    logger,
  }).catch((e) => {
    logger.error(
      `Error scheduling ${CAI_COMMENTS_SYNCHRONIZATION_TASK_ID} task, received ${e.message}`
    );
  });
};
