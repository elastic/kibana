/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, ElasticsearchClient, Logger } from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { CasesServerStartDependencies } from '../types';
import { registerCAIBackfillTask } from './tasks/backfill_task';
import { createCasesAnalyticsIndex } from './cases_index';
import { createCommentsAnalyticsIndex } from './comments_index';
import { createAttachmentsAnalyticsIndex } from './attachments_index';

export const createCasesAnalyticsIndexes = ({
  esClient,
  logger,
  isServerless,
  taskManager,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  isServerless: boolean;
  taskManager: TaskManagerStartContract;
}) => {
  const casesIndex = createCasesAnalyticsIndex({
    logger,
    esClient,
    isServerless,
    taskManager,
  });
  const casesAttachmentsIndex = createCommentsAnalyticsIndex({
    logger,
    esClient,
    isServerless,
    taskManager,
  });
  const casesCommentsIndex = createAttachmentsAnalyticsIndex({
    logger,
    esClient,
    isServerless,
    taskManager,
  });

  return Promise.all([
    casesIndex.upsertIndex(),
    casesAttachmentsIndex.upsertIndex(),
    casesCommentsIndex.upsertIndex(),
  ]);
};

export const registerCasesAnalyticsIndicesTasks = ({
  taskManager,
  logger,
  core,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  core: CoreSetup<CasesServerStartDependencies>;
}) => {
  registerCAIBackfillTask({ taskManager, logger, core });
};
