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
import { getActivityDestinationIndexName } from './activity_index/constants';
import { getAttachmentsDestinationIndexName } from './attachments_index/constants';
import { getCasesDestinationIndexName } from './cases_index/constants';
import { getCommentsDestinationIndexName } from './comments_index/constants';

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
    try {
      await createCasesAnalyticsIndexesForSpaceId({
        spaceId,
        esClient,
        logger,
        isServerless,
        taskManager,
      });
      logger.info(`Successfully created cases analytics indexes for space ${spaceId}`);
    } catch (error) {
      logger.error(`Error creating cases analytics indexes for space ${spaceId}: ${error}`);
    }
  }
};

export async function createCasesAnalyticsIndexesForSpaceId({
  esClient,
  logger,
  isServerless,
  taskManager,
  spaceId,
}: {
  spaceId: string;
  esClient: ElasticsearchClient;
  logger: Logger;
  isServerless: boolean;
  taskManager: TaskManagerStartContract;
}) {
  return Promise.all(
    OWNERS.reduce<Promise<unknown>[]>((operations, owner) => {
      const casesIndex = createCasesAnalyticsIndex({
        logger,
        esClient,
        isServerless,
        taskManager,
        spaceId,
        owner,
      });
      const casesCommentsIndex = createCommentsAnalyticsIndex({
        logger,
        esClient,
        isServerless,
        taskManager,
        spaceId,
        owner,
      });
      const casesAttachmentsIndex = createAttachmentsAnalyticsIndex({
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
      return operations.concat([
        casesIndex.upsertIndex(),
        casesCommentsIndex.upsertIndex(),
        casesAttachmentsIndex.upsertIndex(),
        casesActivityIndex.upsertIndex(),
      ]);
    }, [])
  );
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
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  spaceId: string;
}) => {
  for (const owner of OWNERS) {
    scheduleActivityAnalyticsSyncTask({ taskManager, logger, spaceId, owner });
    scheduleCasesAnalyticsSyncTask({ taskManager, logger, spaceId, owner });
    scheduleCommentsAnalyticsSyncTask({ taskManager, logger, spaceId, owner });
    scheduleAttachmentsAnalyticsSyncTask({ taskManager, logger, spaceId, owner });
  }
};

export const getIndicesForSpaceId = (spaceId: string) => {
  return OWNERS.reduce<string[]>((curr, owner) => {
    return curr.concat([
      getActivityDestinationIndexName(spaceId, owner),
      getAttachmentsDestinationIndexName(spaceId, owner),
      getCasesDestinationIndexName(spaceId, owner),
      getCommentsDestinationIndexName(spaceId, owner),
    ]);
  }, []);
};
