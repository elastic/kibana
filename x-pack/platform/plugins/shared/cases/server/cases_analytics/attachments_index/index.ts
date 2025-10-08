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
  getAttachmentsDestinationIndexName,
  getAttachmentsDestinationIndexAlias,
  CAI_ATTACHMENTS_INDEX_VERSION,
  CAI_ATTACHMENTS_SOURCE_INDEX,
  getAttachmentsSourceQuery,
  getCAIAttachmentsBackfillTaskId,
  getCAIAttachmentsSynchronizationTaskId,
  CAI_ATTACHMENTS_SYNC_TYPE,
} from './constants';
import { CAI_ATTACHMENTS_INDEX_MAPPINGS } from './mappings';
import { CAI_ATTACHMENTS_INDEX_SCRIPT, CAI_ATTACHMENTS_INDEX_SCRIPT_ID } from './painless_scripts';
import { scheduleCAISynchronizationTask } from '../tasks/synchronization_task';

export const createAttachmentsAnalyticsIndex = ({
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
    indexName: getAttachmentsDestinationIndexName(spaceId, owner),
    indexAlias: getAttachmentsDestinationIndexAlias(spaceId, owner),
    indexVersion: CAI_ATTACHMENTS_INDEX_VERSION,
    mappings: CAI_ATTACHMENTS_INDEX_MAPPINGS,
    painlessScriptId: CAI_ATTACHMENTS_INDEX_SCRIPT_ID,
    painlessScript: CAI_ATTACHMENTS_INDEX_SCRIPT,
    taskId: getCAIAttachmentsBackfillTaskId(spaceId, owner),
    sourceIndex: CAI_ATTACHMENTS_SOURCE_INDEX,
    sourceQuery: getAttachmentsSourceQuery(spaceId, owner),
  });

export const scheduleAttachmentsAnalyticsSyncTask = ({
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
  const taskId = getCAIAttachmentsSynchronizationTaskId(spaceId, owner);
  scheduleCAISynchronizationTask({
    taskId,
    sourceIndex: CAI_ATTACHMENTS_SOURCE_INDEX,
    destIndex: getAttachmentsDestinationIndexName(spaceId, owner),
    taskManager,
    spaceId,
    owner,
    syncType: CAI_ATTACHMENTS_SYNC_TYPE,
    logger,
  }).catch((e) => {
    logger.error(`Error scheduling ${taskId} task, received ${e.message}`);
  });
};
