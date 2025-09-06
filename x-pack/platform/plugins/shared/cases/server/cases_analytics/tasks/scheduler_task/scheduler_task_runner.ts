/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SavedObjectsClientContract, Logger } from '@kbn/core/server';
import type { CancellableTask } from '@kbn/task-manager-plugin/server/task';
import { OWNERS } from '../../../../common/constants';
import type { ConfigType } from '../../../config';
import { getAllSpacesWithCases } from '../../utils';
import { scheduleCasesAnalyticsSyncTasks } from '../..';

interface SchedulerTaskRunnerFactoryConstructorParams {
  getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  logger: Logger;
  analyticsConfig: ConfigType['analytics'];
  getTaskManager: () => Promise<TaskManagerStartContract>;
}

export class SchedulerTaskRunner implements CancellableTask {
  private readonly getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  private readonly logger: Logger;
  private readonly analyticsConfig: ConfigType['analytics'];
  private readonly getTaskManager: () => Promise<TaskManagerStartContract>;

  constructor({
    getUnsecureSavedObjectsClient,
    logger,
    analyticsConfig,
    getTaskManager,
  }: SchedulerTaskRunnerFactoryConstructorParams) {
    this.getUnsecureSavedObjectsClient = getUnsecureSavedObjectsClient;
    this.logger = logger;
    this.analyticsConfig = analyticsConfig;
    this.getTaskManager = getTaskManager;
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

      for (const spaceId of spaces) {
        for (const owner of OWNERS) {
          scheduleCasesAnalyticsSyncTasks({
            spaceId,
            owner,
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
