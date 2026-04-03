/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import type { ConfigType } from '../../../config';
import { OwnerSyncTaskRunner } from './owner_sync_task_runner';

interface OwnerSyncTaskFactoryParams {
  logger: Logger;
  getESClient: () => Promise<ElasticsearchClient>;
  getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  analyticsConfig: ConfigType['analytics'];
}

export class OwnerSyncTaskFactory {
  private readonly logger: Logger;
  private readonly getESClient: () => Promise<ElasticsearchClient>;
  private readonly getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  private readonly analyticsConfig: ConfigType['analytics'];

  constructor({
    logger,
    getESClient,
    getUnsecureSavedObjectsClient,
    analyticsConfig,
  }: OwnerSyncTaskFactoryParams) {
    this.logger = logger;
    this.getESClient = getESClient;
    this.getUnsecureSavedObjectsClient = getUnsecureSavedObjectsClient;
    this.analyticsConfig = analyticsConfig;
  }

  public create(context: RunContext): OwnerSyncTaskRunner {
    return new OwnerSyncTaskRunner({
      taskInstance: context.taskInstance,
      logger: this.logger,
      getESClient: this.getESClient,
      getUnsecureSavedObjectsClient: this.getUnsecureSavedObjectsClient,
      analyticsConfig: this.analyticsConfig,
    });
  }
}
