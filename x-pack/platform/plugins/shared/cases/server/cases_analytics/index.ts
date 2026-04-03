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
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { Owner } from '../../common/constants/types';
import type { CasesServerStartDependencies } from '../types';
import { registerCAIBackfillTask } from './tasks/backfill_task';
import { registerOwnerSyncTask } from './tasks/owner_sync_task';
import { ANALYTICS_SYNCHRONIZATION_TASK_TYPE } from '../../common/constants';
import { createContentAnalyticsIndex } from './content_index';
import { createActivityAnalyticsIndex } from './activity_index';
import { createLifecycleAnalyticsTransform } from './lifecycle_index';
import type { ConfigType } from '../config';
import { getSpacesWithAnalyticsEnabled } from './utils';
import { registerCAISchedulerTask } from './tasks/scheduler_task';
import { getActivityDestinationIndexName } from './activity_index/constants';
import { getContentDestinationIndexName } from './content_index/constants';
import { getLifecycleDestinationIndexName } from './lifecycle_index/constants';
import { createAnalyticsDataViews } from './data_views';
import { provisionAnalyticsDashboard } from './dashboard';

export const createCasesAnalyticsIndexes = async ({
  esClient,
  logger,
  isServerless,
  taskManager,
  savedObjectsClient,
  dataViewsService,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  isServerless: boolean;
  taskManager: TaskManagerStartContract;
  savedObjectsClient: SavedObjectsClientContract;
  dataViewsService?: DataViewsService;
}) => {
  const pairs = await getSpacesWithAnalyticsEnabled(savedObjectsClient);
  const spacesProcessed = new Set<string>();
  for (const { spaceId, owner } of pairs) {
    try {
      await createCasesAnalyticsIndexesForOwnerAndSpace({
        spaceId,
        owner,
        esClient,
        logger,
        isServerless,
        taskManager,
      });
      logger.info(
        `Successfully created cases analytics indexes for owner ${owner} in space ${spaceId}`
      );
      if (!spacesProcessed.has(spaceId)) {
        spacesProcessed.add(spaceId);
        if (dataViewsService) {
          createAnalyticsDataViews(dataViewsService, logger, spaceId).catch((err) => {
            logger.warn(
              `Failed to create analytics data views in space ${spaceId}: ${err.message}`
            );
          });
        }
        provisionAnalyticsDashboard(savedObjectsClient, logger, spaceId).catch((err) => {
          logger.warn(
            `Failed to provision analytics dashboard in space ${spaceId}: ${err.message}`
          );
        });
      }
    } catch (error) {
      logger.error(
        `Error creating cases analytics indexes for owner ${owner} in space ${spaceId}: ${error}`
      );
    }
  }
};

export async function createCasesAnalyticsIndexesForOwnerAndSpace({
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
  const contentIndex = createContentAnalyticsIndex({
    logger,
    esClient,
    isServerless,
    taskManager,
    spaceId,
    owner,
  });
  const activityIndex = createActivityAnalyticsIndex({
    logger,
    esClient,
    isServerless,
    taskManager,
    spaceId,
    owner,
  });
  await Promise.all([contentIndex.upsertIndex(), activityIndex.upsertIndex()]);

  // The lifecycle transform reads from the activity index, so it must be
  // created after the activity index is ready.
  const lifecycleTransform = createLifecycleAnalyticsTransform({
    esClient,
    logger,
    isServerless,
    spaceId,
    owner,
  });
  await lifecycleTransform.upsert();
}

export const registerCasesAnalyticsIndexesTasks = ({
  taskManager,
  logger,
  core,
  analyticsConfig,
  isServerless,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  core: CoreSetup<CasesServerStartDependencies>;
  analyticsConfig: ConfigType['analytics'];
  isServerless: boolean;
}) => {
  registerCAIBackfillTask({ taskManager, logger, core, analyticsConfig });
  registerCAISchedulerTask({ taskManager, logger, core, analyticsConfig, isServerless });
  // Register the new per-owner consolidated sync task (3 tasks, one per owner type)
  registerOwnerSyncTask({ taskManager, logger, core, analyticsConfig });
  // Register old per-space sync task type as a no-op so existing task-manager records
  // from pre-GA deployments do not surface "unknown task type" errors on upgrade.
  // The scheduler task's migration pass will remove these stale records on first run.
  taskManager.registerTaskDefinitions({
    [ANALYTICS_SYNCHRONIZATION_TASK_TYPE]: {
      title: '[Deprecated] Cases analytics per-space sync task (no-op)',
      createTaskRunner: () => ({
        run: async () => ({ state: {} }),
        cancel: async () => {},
      }),
    },
  });
};

export const getIndicesForOwnerAndSpace = (spaceId: string, owner: Owner): string[] => {
  return [
    getActivityDestinationIndexName(spaceId, owner),
    getContentDestinationIndexName(spaceId, owner),
    getLifecycleDestinationIndexName(spaceId, owner),
  ];
};
