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
  CAI_ACTIVITY_INDEX_NAME,
  CAI_ACTIVITY_INDEX_ALIAS,
  CAI_ACTIVITY_INDEX_VERSION,
  CAI_ACTIVITY_SOURCE_INDEX,
  getActivitySourceQuery,
  getCAIActivitySynchronizationTaskId,
  getCAIActivityBackfillTaskId,
  CAI_ACTIVITY_SYNC_TYPE,
} from './constants';
import { CAI_ACTIVITY_INDEX_MAPPINGS } from './mappings';
import { CAI_ACTIVITY_INDEX_SCRIPT, CAI_ACTIVITY_INDEX_SCRIPT_ID } from './painless_scripts';
import { scheduleCAISynchronizationTask } from '../tasks/synchronization_task';

export const createActivityAnalyticsIndex = ({
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
    indexVersion: CAI_ACTIVITY_INDEX_VERSION,
    mappings: CAI_ACTIVITY_INDEX_MAPPINGS,
    painlessScriptId: CAI_ACTIVITY_INDEX_SCRIPT_ID,
    painlessScript: CAI_ACTIVITY_INDEX_SCRIPT,
    taskId: getCAIActivityBackfillTaskId(spaceId, owner),
    sourceIndex: CAI_ACTIVITY_SOURCE_INDEX,
    sourceQuery: getActivitySourceQuery(spaceId, owner),
  });

export const scheduleActivityAnalyticsSyncTask = ({
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
  const taskId = getCAIActivitySynchronizationTaskId(spaceId, owner);
  scheduleCAISynchronizationTask({
    taskId,
    sourceIndex: CAI_ACTIVITY_SOURCE_INDEX,
    destIndex: getDestinationIndexName(spaceId, owner),
    spaceId,
    owner,
    syncType: CAI_ACTIVITY_SYNC_TYPE,
    taskManager,
    logger,
  }).catch((e) => {
    logger.error(`Error scheduling ${taskId} task, received ${e.message}`);
  });
};

function getDestinationIndexName(spaceId: string, owner: Owner) {
  return `${CAI_ACTIVITY_INDEX_NAME}.${spaceId}-${owner}`.toLowerCase();
}

function getDestinationIndexAlias(spaceId: string, owner: Owner) {
  return `${CAI_ACTIVITY_INDEX_ALIAS}.${spaceId}-${owner}`.toLowerCase();
}
