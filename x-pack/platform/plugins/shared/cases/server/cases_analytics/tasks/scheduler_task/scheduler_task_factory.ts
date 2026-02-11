/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { ConfigType } from '../../../config';
import { SchedulerTaskRunner } from './scheduler_task_runner';

interface AnalyticsIndexSchedulerTaskFactoryParams {
  getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  logger: Logger;
  analyticsConfig: ConfigType['analytics'];
  getTaskManager: () => Promise<TaskManagerStartContract>;
  getESClient: () => Promise<ElasticsearchClient>;
}

export class AnalyticsIndexSchedulerTaskFactory {
  private readonly analyticsConfig: ConfigType['analytics'];
  private readonly logger: Logger;
  private readonly getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  private readonly getTaskManager: () => Promise<TaskManagerStartContract>;
  private readonly getESClient: () => Promise<ElasticsearchClient>;

  constructor({
    logger,
    getUnsecureSavedObjectsClient,
    analyticsConfig,
    getTaskManager,
    getESClient,
  }: AnalyticsIndexSchedulerTaskFactoryParams) {
    this.analyticsConfig = analyticsConfig;
    this.logger = logger;
    this.getUnsecureSavedObjectsClient = getUnsecureSavedObjectsClient;
    this.getTaskManager = getTaskManager;
    this.getESClient = getESClient;
  }

  public create() {
    return new SchedulerTaskRunner({
      analyticsConfig: this.analyticsConfig,
      logger: this.logger,
      getUnsecureSavedObjectsClient: this.getUnsecureSavedObjectsClient,
      getTaskManager: this.getTaskManager,
      getESClient: this.getESClient,
    });
  }
}
