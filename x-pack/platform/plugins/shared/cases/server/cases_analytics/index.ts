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
import { registerCAISynchronizationTask } from './tasks/synchronization_task';
import {
  createAttachmentsAnalyticsIndex,
  scheduleAttachmentsAnalyticsSyncTask,
} from './attachments_index';
import { createCasesAnalyticsIndex, scheduleCasesAnalyticsSyncTask } from './cases_index';
import { createCommentsAnalyticsIndex, scheduleCommentsAnalyticsSyncTask } from './comments_index';
import { createActivityAnalyticsIndex, scheduleActivityAnalyticsSyncTask } from './activity_index';
import type { ConfigType } from '../config';

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
  const casesActivityIndex = createActivityAnalyticsIndex({
    logger,
    esClient,
    isServerless,
    taskManager,
  });

  return Promise.all([
    casesIndex.upsertIndex(),
    casesAttachmentsIndex.upsertIndex(),
    casesCommentsIndex.upsertIndex(),
    casesActivityIndex.upsertIndex(),
  ]);
};

export const registerCasesAnalyticsIndexesTasks = ({
  taskManager,
  logger,
  core,
  analyticsConfig,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  core: CoreSetup<CasesServerStartDependencies>;
  analyticsConfig: ConfigType['analytics'];
}) => {
  registerCAIBackfillTask({ taskManager, logger, core, analyticsConfig });
  registerCAISynchronizationTask({ taskManager, logger, core, analyticsConfig });
};

export const scheduleCasesAnalyticsSyncTasks = ({
  taskManager,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
}) => {
  scheduleActivityAnalyticsSyncTask({ taskManager, logger });
  scheduleCasesAnalyticsSyncTask({ taskManager, logger });
  scheduleCommentsAnalyticsSyncTask({ taskManager, logger });
  scheduleAttachmentsAnalyticsSyncTask({ taskManager, logger });
};
