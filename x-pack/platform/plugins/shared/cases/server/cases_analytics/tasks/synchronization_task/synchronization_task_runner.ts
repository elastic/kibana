/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { type ConcreteTaskInstance } from '@kbn/task-manager-plugin/server';
import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
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
import { CASE_CONFIGURE_SAVED_OBJECT } from '../../../../common/constants';
import type { ConfigurationPersistedAttributes } from '../../../common/types/configure';

interface SynchronizationTaskRunnerFactoryConstructorParams {
  taskInstance: ConcreteTaskInstance;
  getESClient: () => Promise<ElasticsearchClient>;
  getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
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
  private readonly getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  private readonly previousTaskState?: SynchronizationTaskStateBySyncType;
  private readonly logger: Logger;

  private readonly analyticsConfig: ConfigType['analytics'];

  constructor({
    taskInstance,
    getESClient,
    getUnsecureSavedObjectsClient,
    logger,
    analyticsConfig,
  }: SynchronizationTaskRunnerFactoryConstructorParams) {
    this.previousTaskState =
      (taskInstance.state as SynchronizationTaskStateBySyncType) || undefined;
    this.owner = taskInstance.params.owner;
    this.spaceId = taskInstance.params.spaceId;
    this.getESClient = getESClient;
    this.getUnsecureSavedObjectsClient = getUnsecureSavedObjectsClient;
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

    // If any sync type completed successfully, update analytics_last_sync_at on the configure SO
    const lastSyncSuccessTimes = results
      .map((r) => r?.lastSyncSuccess)
      .filter((t): t is Date => t instanceof Date);

    if (lastSyncSuccessTimes.length > 0) {
      const maxLastSyncSuccess = new Date(
        Math.max(...lastSyncSuccessTimes.map((d) => d.getTime()))
      );
      this.updateConfigureLastSyncAt(maxLastSyncSuccess.toISOString()).catch((err) => {
        this.logger.warn(
          `[synchronization-task-runner] Failed to update analytics_last_sync_at for owner ${this.owner} in space ${this.spaceId}: ${err.message}`
        );
      });
    }

    return {
      state: {
        ...this.previousTaskState,
        ...newTaskState,
      },
    };
  }

  private async updateConfigureLastSyncAt(timestamp: string): Promise<void> {
    const soClient = await this.getUnsecureSavedObjectsClient();

    const results = await soClient.find<ConfigurationPersistedAttributes>({
      type: CASE_CONFIGURE_SAVED_OBJECT,
      namespaces: [this.spaceId],
      filter: `${CASE_CONFIGURE_SAVED_OBJECT}.attributes.owner: "${this.owner}"`,
      perPage: 1,
    });

    if (results.saved_objects.length === 0) {
      return;
    }

    const so = results.saved_objects[0];
    await soClient.update<ConfigurationPersistedAttributes>(
      CASE_CONFIGURE_SAVED_OBJECT,
      so.id,
      { analytics_last_sync_at: timestamp },
      { namespace: this.spaceId === 'default' ? undefined : this.spaceId }
    );
  }

  public async cancel() {}
}
