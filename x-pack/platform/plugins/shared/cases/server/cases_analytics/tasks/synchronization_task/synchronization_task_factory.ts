/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Logger } from '@kbn/logging';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import type { ConfigType } from '../../../config';
import { SynchronizationTaskRunner } from './synchronization_task_runner';

interface AnalyticsIndexSynchronizationTaskFactoryParams {
  logger: Logger;
  getESClient: () => Promise<ElasticsearchClient>;
  analyticsConfig: ConfigType['analytics'];
}

export class AnalyticsIndexSynchronizationTaskFactory {
  private readonly logger: Logger;
  private readonly getESClient: () => Promise<ElasticsearchClient>;
  private readonly analyticsConfig: ConfigType['analytics'];

  constructor({
    logger,
    getESClient,
    analyticsConfig,
  }: AnalyticsIndexSynchronizationTaskFactoryParams) {
    this.logger = logger;
    this.getESClient = getESClient;
    this.analyticsConfig = analyticsConfig;
  }

  public create(context: RunContext) {
    return new SynchronizationTaskRunner({
      taskInstance: context.taskInstance,
      logger: this.logger,
      getESClient: this.getESClient,
      analyticsConfig: this.analyticsConfig,
    });
  }
}
