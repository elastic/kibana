/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SavedObjectsClientContract, Logger, ElasticsearchClient } from '@kbn/core/server';
import type { CancellableTask } from '@kbn/task-manager-plugin/server/task';
import type { ConfigType } from '../../../config';
import { getSpacesWithAnalyticsEnabled } from '../../utils';
import {
  createCasesAnalyticsIndexesForSpaceId,
  getIndicesForSpaceId,
  scheduleCasesAnalyticsSyncTasks,
} from '../..';

interface SchedulerTaskRunnerFactoryConstructorParams {
  getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  logger: Logger;
  analyticsConfig: ConfigType['analytics'];
  getTaskManager: () => Promise<TaskManagerStartContract>;
  getESClient: () => Promise<ElasticsearchClient>;
}

export class SchedulerTaskRunner implements CancellableTask {
  private readonly getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  private readonly logger: Logger;
  private readonly analyticsConfig: ConfigType['analytics'];
  private readonly getTaskManager: () => Promise<TaskManagerStartContract>;
  private readonly getESClient: () => Promise<ElasticsearchClient>;

  constructor({
    getUnsecureSavedObjectsClient,
    logger,
    analyticsConfig,
    getTaskManager,
    getESClient,
  }: SchedulerTaskRunnerFactoryConstructorParams) {
    this.getUnsecureSavedObjectsClient = getUnsecureSavedObjectsClient;
    this.logger = logger;
    this.analyticsConfig = analyticsConfig;
    this.getTaskManager = getTaskManager;
    this.getESClient = getESClient;
  }

  public async run() {
    if (!this.analyticsConfig.index.enabled) {
      this.logger.info(
        '[CAI Scheduler] Analytics indexing is disabled (xpack.cases.analytics.index.enabled=false). Skipping.'
      );
      return;
    }

    this.logger.info('[CAI Scheduler] Starting cases analytics scheduler task.');

    try {
      const unsecureSavedObjectsClient = await this.getUnsecureSavedObjectsClient();
      const pairs = await getSpacesWithAnalyticsEnabled(unsecureSavedObjectsClient);

      if (pairs.length === 0) {
        this.logger.info(
          '[CAI Scheduler] No spaces have analytics_enabled=true on their cases-configure saved object. Nothing to do.'
        );
        return;
      }

      this.logger.info(
        `[CAI Scheduler] Found ${pairs.length} space+owner pair(s) with analytics enabled: [${pairs
          .map(({ spaceId, owner }) => `${spaceId}/${owner}`)
          .join(', ')}]`
      );

      const taskManager = await this.getTaskManager();
      const esClient = await this.getESClient();

      for (const { spaceId, owner } of pairs) {
        const indices = getIndicesForSpaceId(spaceId, owner);
        const destIndicesExist = await esClient.indices.exists({ index: indices });

        if (!destIndicesExist) {
          this.logger.info(
            `[CAI Scheduler] Space "${spaceId}" owner "${owner}": analytics indices do not exist yet — creating indices and scheduling backfill.`
          );
          createCasesAnalyticsIndexesForSpaceId({
            spaceId,
            owner,
            esClient,
            logger: this.logger,
            isServerless: false,
            taskManager,
          }).catch(() => {
            this.logger.error(
              `[CAI Scheduler] Space "${spaceId}" owner "${owner}": failed to create analytics indices.`
            );
          });
        } else {
          this.logger.info(
            `[CAI Scheduler] Space "${spaceId}" owner "${owner}": analytics indices exist — scheduling incremental sync tasks.`
          );
          scheduleCasesAnalyticsSyncTasks({
            spaceId,
            owner,
            taskManager,
            logger: this.logger,
          });
        }
      }

      this.logger.info('[CAI Scheduler] Cases analytics scheduler task completed.');
    } catch (error) {
      this.logger.error(
        `[CAI Scheduler] Error occurred while running case analytics scheduler task: ${error.message}`
      );
    }
  }

  public async cancel() {
    this.logger.debug('Cancelling case analytics scheduler task.');
  }
}
