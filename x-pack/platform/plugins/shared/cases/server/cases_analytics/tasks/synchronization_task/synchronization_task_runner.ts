/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { type ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { CancellableTask } from '@kbn/task-manager-plugin/server/task';
import type { Owner } from '../../../../common/constants/types';
import type { ConfigType } from '../../../config';
import {
  type CAISyncType,
  CAISyncTypes,
  sourceIndexBySyncType,
  destinationIndexBySyncType,
} from '../../constants';
import { SynchronizationSubTaskRunner } from './synchronization_sub_task';

interface SynchronizationTaskRunnerFactoryConstructorParams {
  taskInstance: ConcreteTaskInstance;
  getESClient: () => Promise<ElasticsearchClient>;
  logger: Logger;
  analyticsConfig: ConfigType['analytics'];
}

type SynchronizationTaskStateBySyncType = Record<CAISyncType, SynchronizationTaskState>;

interface SynchronizationTaskState {
  lastSyncSuccess?: string;
  lastSyncAttempt?: string;
  esReindexTaskId?: TaskId;
}

export class SynchronizationTaskRunner implements CancellableTask {
  private readonly owner: Owner;
  private readonly spaceId: string;
  private readonly getESClient: () => Promise<ElasticsearchClient>;
  private readonly previousTaskState?: SynchronizationTaskStateBySyncType;
  private readonly logger: Logger;

  private readonly analyticsConfig: ConfigType['analytics'];

  constructor({
    taskInstance,
    getESClient,
    logger,
    analyticsConfig,
  }: SynchronizationTaskRunnerFactoryConstructorParams) {
    this.previousTaskState =
      (taskInstance.state as SynchronizationTaskStateBySyncType) || undefined;
    this.owner = taskInstance.params.owner;
    this.spaceId = taskInstance.params.spaceId;
    this.getESClient = getESClient;
    this.logger = logger;
    this.analyticsConfig = analyticsConfig;
  }

  public async run() {
    if (!this.analyticsConfig.index.enabled) {
      this.logger.debug(
        `[synchronization-task-runner] Analytics index is disabled, skipping synchronization task.`,
        {
          tags: ['cai-synchronization', 'synchronization-task-runner'],
        }
      );
      return;
    }

    const esClient = await this.getESClient();
    const subTasks = CAISyncTypes.map((syncType) => {
      const stateForSyncType = this.previousTaskState
        ? this.previousTaskState[syncType]
        : undefined;

      return new SynchronizationSubTaskRunner({
        esReindexTaskId: stateForSyncType?.esReindexTaskId,
        lastSyncSuccess: stateForSyncType?.lastSyncSuccess,
        lastSyncAttempt: stateForSyncType?.lastSyncAttempt,
        sourceIndex: sourceIndexBySyncType(syncType),
        destIndex: destinationIndexBySyncType(syncType, this.spaceId, this.owner),
        owner: this.owner,
        spaceId: this.spaceId,
        syncType,
        esClient,
        logger: this.logger,
      }).run();
    });

    // We're not catching errors here so that sub task errors are bubbled up and handled by the task manager
    const results = await Promise.all(subTasks);

    const newTaskState = results.reduce<Partial<SynchronizationTaskStateBySyncType>>(
      (acc, result) => {
        if (result?.syncType) {
          acc[result.syncType] = result as SynchronizationTaskState;
          return acc;
        }
        return acc;
      },
      {}
    );

    return {
      state: {
        ...this.previousTaskState,
        ...newTaskState,
      },
    };
  }

  public async cancel() {}
}
