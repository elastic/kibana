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
  CAI_ATTACHMENTS_INDEX_NAME,
  CAI_ATTACHMENTS_INDEX_VERSION,
  CAI_ATTACHMENTS_SOURCE_INDEX,
  CAI_ATTACHMENTS_SOURCE_QUERY,
  CAI_ATTACHMENTS_BACKFILL_TASK_ID,
} from './constants';
import { CAI_ATTACHMENTS_INDEX_MAPPINGS } from './mappings';
import { CAI_ATTACHMENTS_INDEX_SCRIPT, CAI_ATTACHMENTS_INDEX_SCRIPT_ID } from './painless_scripts';

export const createAttachmentsAnalyticsIndex = ({
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
    indexName: CAI_ATTACHMENTS_INDEX_NAME,
    indexVersion: CAI_ATTACHMENTS_INDEX_VERSION,
    mappings: CAI_ATTACHMENTS_INDEX_MAPPINGS,
    painlessScriptId: CAI_ATTACHMENTS_INDEX_SCRIPT_ID,
    painlessScript: CAI_ATTACHMENTS_INDEX_SCRIPT,
    taskId: CAI_ATTACHMENTS_BACKFILL_TASK_ID,
    sourceIndex: CAI_ATTACHMENTS_SOURCE_INDEX,
    sourceQuery: CAI_ATTACHMENTS_SOURCE_QUERY,
  });
