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
import { getAllSpacesWithCases } from '../../utils';
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
      this.logger.debug('Analytics index is disabled, skipping scheduler task.');
      return;
    }
    try {
      const unsecureSavedObjectsClient = await this.getUnsecureSavedObjectsClient();
      const spaces = await getAllSpacesWithCases(unsecureSavedObjectsClient);
      const taskManager = await this.getTaskManager();
      const esClient = await this.getESClient();

      for (const spaceId of spaces) {
        const indices = getIndicesForSpaceId(spaceId);
        const destIndicesExist = await esClient.indices.exists({ index: indices });
        if (!destIndicesExist) {
          // Create the necessary analytics indexes without scheduling the sync tasks
          createCasesAnalyticsIndexesForSpaceId({
            spaceId,
            esClient,
            logger: this.logger,
            isServerless: false,
            taskManager,
          }).catch(() => {
            this.logger.error(`Failed to create analytics indexes for space ${spaceId}`);
          });
        } else {
          scheduleCasesAnalyticsSyncTasks({
            spaceId,
            taskManager,
            logger: this.logger,
          });
        }
      }
    } catch (error) {
      this.logger.error(
        `Error occurred while running case analytics scheduler task: ${error.message}`
      );
    }
  }

  public async cancel() {
    this.logger.debug('Cancelling case analytics scheduler task.');
  }
}
