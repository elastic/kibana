/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { OWNERS } from '../../common/constants';
import type { Owner } from '../../common/constants/types';
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
import { getAllSpacesWithCases } from './utils';
import { registerCAISchedulerTask } from './tasks/scheduler_task';

export const createCasesAnalyticsIndexes = async ({
  esClient,
  logger,
  isServerless,
  taskManager,
  savedObjectsClient,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  isServerless: boolean;
  taskManager: TaskManagerStartContract;
  savedObjectsClient: SavedObjectsClientContract;
}) => {
  const spaces: string[] = await getAllSpacesWithCases(savedObjectsClient);
  for (const spaceId of spaces) {
    for (const owner of OWNERS)
      try {
        await createCasesAnalyticsIndexesForSpaceId({
          spaceId,
          owner,
          esClient,
          logger,
          isServerless,
          taskManager,
        });
        logger.info(
          `Successfully created cases analytics indexes for space ${spaceId} and owner ${owner}`
        );
      } catch (error) {
        logger.error(
          `Error creating cases analytics indexes for space ${spaceId} and owner ${owner}: ${error}`
        );
      }
  }
};

async function createCasesAnalyticsIndexesForSpaceId({
  esClient,
  logger,
  isServerless,
  taskManager,
  spaceId,
  owner,
}: {
  spaceId: string;
  owner: Owner;
  esClient: ElasticsearchClient;
  logger: Logger;
  isServerless: boolean;
  taskManager: TaskManagerStartContract;
}) {
  const casesIndex = createCasesAnalyticsIndex({
    logger,
    esClient,
    isServerless,
    taskManager,
    spaceId,
    owner,
  });
  const casesAttachmentsIndex = createCommentsAnalyticsIndex({
    logger,
    esClient,
    isServerless,
    taskManager,
    spaceId,
    owner,
  });
  const casesCommentsIndex = createAttachmentsAnalyticsIndex({
    logger,
    esClient,
    isServerless,
    taskManager,
    spaceId,
    owner,
  });
  const casesActivityIndex = createActivityAnalyticsIndex({
    logger,
    esClient,
    isServerless,
    taskManager,
    spaceId,
    owner,
  });

  return Promise.all([
    casesIndex.upsertIndex(),
    casesAttachmentsIndex.upsertIndex(),
    casesCommentsIndex.upsertIndex(),
    casesActivityIndex.upsertIndex(),
  ]);
}

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
  registerCAISchedulerTask({ taskManager, logger, core, analyticsConfig });
  registerCAISynchronizationTask({ taskManager, logger, core, analyticsConfig });
};

export const scheduleCasesAnalyticsSyncTasks = ({
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
  scheduleActivityAnalyticsSyncTask({ taskManager, logger, spaceId, owner });
  scheduleCasesAnalyticsSyncTask({
    taskManager,
    logger,
    spaceId,
    owner,
  });
  scheduleCommentsAnalyticsSyncTask({ taskManager, logger, spaceId, owner });
  scheduleAttachmentsAnalyticsSyncTask({ taskManager, logger, spaceId, owner });
};
