/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { AnalyticsIndex } from '../analytics_index';
import { CAI_CASES_INDEX_NAME, CAI_CASES_SOURCE_INDEX, CAI_CASES_SOURCE_QUERY } from './constants';
import { CAI_CASES_INDEX_MAPPINGS } from './mappings';
import { CAI_CASES_INDEX_SCRIPT_ID, CAI_CASES_INDEX_SCRIPT } from './painless_scripts';

export const createCasesAnalyticsIndex = ({
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
    indexName: CAI_CASES_INDEX_NAME,
    mappings: CAI_CASES_INDEX_MAPPINGS,
    painlessScriptId: CAI_CASES_INDEX_SCRIPT_ID,
    painlessScript: CAI_CASES_INDEX_SCRIPT,
    taskId: 'cai_cases_backfill_task',
    sourceIndex: CAI_CASES_SOURCE_INDEX,
    sourceQuery: CAI_CASES_SOURCE_QUERY,
  });
