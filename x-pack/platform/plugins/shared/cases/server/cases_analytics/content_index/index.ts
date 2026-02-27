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
  getContentDestinationIndexName,
  getContentIndexName,
  CAI_CONTENT_INDEX_VERSION,
  CAI_CONTENT_SOURCE_INDEX,
  getContentSourceQuery,
  getCAIContentBackfillTaskId,
} from './constants';
import { CAI_CONTENT_INDEX_MAPPINGS } from './mappings';
import { CAI_CONTENT_INDEX_SCRIPT_ID, CAI_CONTENT_INDEX_SCRIPT } from './painless_scripts';

export const createContentAnalyticsIndex = ({
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
    indexName: getContentDestinationIndexName(spaceId, owner),
    indexAlias: getContentIndexName(owner, spaceId),
    indexVersion: CAI_CONTENT_INDEX_VERSION,
    mappings: CAI_CONTENT_INDEX_MAPPINGS,
    painlessScriptId: CAI_CONTENT_INDEX_SCRIPT_ID,
    painlessScript: CAI_CONTENT_INDEX_SCRIPT,
    taskId: getCAIContentBackfillTaskId(spaceId, owner),
    sourceIndex: CAI_CONTENT_SOURCE_INDEX,
    sourceQuery: getContentSourceQuery(spaceId, owner),
  });
