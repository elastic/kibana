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
  getCommentsDestinationIndexName,
  getCommentsDestinationIndexAlias,
  CAI_COMMENTS_INDEX_VERSION,
  CAI_COMMENTS_SOURCE_INDEX,
  getCommentsSourceQuery,
  getCAICommentsBackfillTaskId,
} from './constants';
import { CAI_COMMENTS_INDEX_MAPPINGS } from './mappings';
import { CAI_COMMENTS_INDEX_SCRIPT, CAI_COMMENTS_INDEX_SCRIPT_ID } from './painless_scripts';

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
    indexName: getCommentsDestinationIndexName(spaceId, owner),
    indexAlias: getCommentsDestinationIndexAlias(spaceId, owner),
    indexVersion: CAI_COMMENTS_INDEX_VERSION,
    mappings: CAI_COMMENTS_INDEX_MAPPINGS,
    painlessScriptId: CAI_COMMENTS_INDEX_SCRIPT_ID,
    painlessScript: CAI_COMMENTS_INDEX_SCRIPT,
    taskId: getCAICommentsBackfillTaskId(spaceId, owner),
    sourceIndex: CAI_COMMENTS_SOURCE_INDEX,
    sourceQuery: getCommentsSourceQuery(spaceId, owner),
  });
