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
  getCasesDestinationIndexName,
  getCasesDestinationIndexAlias,
  CAI_CASES_INDEX_VERSION,
  CAI_CASES_SOURCE_INDEX,
  getCasesSourceQuery,
  getCAICasesBackfillTaskId,
} from './constants';
import { CAI_CASES_INDEX_MAPPINGS } from './mappings';
import { CAI_CASES_INDEX_SCRIPT_ID, CAI_CASES_INDEX_SCRIPT } from './painless_scripts';

export const createCasesAnalyticsIndex = ({
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
    indexName: getCasesDestinationIndexName(spaceId, owner),
    indexAlias: getCasesDestinationIndexAlias(spaceId, owner),
    indexVersion: CAI_CASES_INDEX_VERSION,
    mappings: CAI_CASES_INDEX_MAPPINGS,
    painlessScriptId: CAI_CASES_INDEX_SCRIPT_ID,
    painlessScript: CAI_CASES_INDEX_SCRIPT,
    taskId: getCAICasesBackfillTaskId(spaceId, owner),
    sourceIndex: CAI_CASES_SOURCE_INDEX,
    sourceQuery: getCasesSourceQuery(spaceId, owner),
  });
