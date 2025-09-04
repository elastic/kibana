/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { Owner } from '../../../common/constants/types';
import { AnalyticsIndex } from '../analytics_index';
import {
  CAI_COMMENTS_INDEX_NAME,
  CAI_COMMENTS_INDEX_ALIAS,
  CAI_COMMENTS_INDEX_VERSION,
  CAI_COMMENTS_SOURCE_INDEX,
  getCommentsSourceQuery,
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
  spaceId,
  owner,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  isServerless: boolean;
  taskManager: TaskManagerStartContract;
  spaceId: string;
  owner: Owner;
}): AnalyticsIndex =>
  new AnalyticsIndex({
    logger,
    esClient,
    isServerless,
    taskManager,
    indexName: getDestinationIndexName(spaceId, owner),
    indexAlias: getDestinationIndexAlias(spaceId, owner),
    indexVersion: CAI_COMMENTS_INDEX_VERSION,
    mappings: CAI_COMMENTS_INDEX_MAPPINGS,
    painlessScriptId: CAI_COMMENTS_INDEX_SCRIPT_ID,
    painlessScript: CAI_COMMENTS_INDEX_SCRIPT,
    taskId: CAI_COMMENTS_BACKFILL_TASK_ID,
    sourceIndex: CAI_COMMENTS_SOURCE_INDEX,
    sourceQuery: getCommentsSourceQuery(spaceId, owner),
  });

export const scheduleCommentsAnalyticsSyncTask = ({
  taskManager,
  logger,
  spaceId,
  owner,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  spaceId: string;
  owner: Owner;
}) => {
  scheduleCAISynchronizationTask({
    taskId: CAI_COMMENTS_SYNCHRONIZATION_TASK_ID,
    sourceIndex: CAI_COMMENTS_SOURCE_INDEX,
    destIndex: getDestinationIndexName(spaceId, owner),
    taskManager,
    logger,
  }).catch((e) => {
    logger.error(
      `Error scheduling ${CAI_COMMENTS_SYNCHRONIZATION_TASK_ID} task, received ${e.message}`
    );
  });
};

function getDestinationIndexName(spaceId: string, owner: Owner) {
  return `${CAI_COMMENTS_INDEX_NAME}.${spaceId}-${owner}`.toLowerCase();
}

function getDestinationIndexAlias(spaceId: string, owner: Owner) {
  return `${CAI_COMMENTS_INDEX_ALIAS}.${spaceId}-${owner}`.toLowerCase();
}
