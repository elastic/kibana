/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ConcreteTaskInstance,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { SavedObjectsClientContract, Logger, ElasticsearchClient } from '@kbn/core/server';
import type { CancellableTask } from '@kbn/task-manager-plugin/server/task';
import type { ConfigType } from '../../../config';
import { getSpacesWithAnalyticsEnabled } from '../../utils';
import type { OwnerSpacePair } from '../../utils';
import { createCasesAnalyticsIndexesForOwnerAndSpace, getIndicesForOwnerAndSpace } from '../..';
import { scheduleOwnerSyncTasks } from '../owner_sync_task';
import { getSynchronizationTaskId } from '../synchronization_task';
import type { Owner } from '../../../../common/constants/types';

interface SchedulerTaskRunnerFactoryConstructorParams {
  taskInstance: ConcreteTaskInstance;
  getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  logger: Logger;
  analyticsConfig: ConfigType['analytics'];
  getTaskManager: () => Promise<TaskManagerStartContract>;
  getESClient: () => Promise<ElasticsearchClient>;
  isServerless: boolean;
}

interface SchedulerTaskState extends Record<string, unknown> {
  /**
   * Set to true once old per-space sync tasks (ANALYTICS_SYNCHRONIZATION_TASK_TYPE)
   * have been removed.  Without this guard, every hourly scheduler run would
   * attempt to remove potentially thousands of non-existent task records.
   */
  migrationDone?: boolean;
}

export class SchedulerTaskRunner implements CancellableTask {
  private readonly getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  private readonly logger: Logger;
  private readonly analyticsConfig: ConfigType['analytics'];
  private readonly getTaskManager: () => Promise<TaskManagerStartContract>;
  private readonly getESClient: () => Promise<ElasticsearchClient>;
  private readonly isServerless: boolean;
  private readonly previousState: SchedulerTaskState;

  constructor({
    taskInstance,
    getUnsecureSavedObjectsClient,
    logger,
    analyticsConfig,
    getTaskManager,
    getESClient,
    isServerless,
  }: SchedulerTaskRunnerFactoryConstructorParams) {
    this.previousState = (taskInstance.state as SchedulerTaskState) ?? {};
    this.getUnsecureSavedObjectsClient = getUnsecureSavedObjectsClient;
    this.logger = logger;
    this.analyticsConfig = analyticsConfig;
    this.getTaskManager = getTaskManager;
    this.getESClient = getESClient;
    this.isServerless = isServerless;
  }

  public async run() {
    if (!this.analyticsConfig.index.enabled) {
      this.logger.debug('Analytics index is disabled, skipping scheduler task.');
      return;
    }
    try {
      const unsecureSavedObjectsClient = await this.getUnsecureSavedObjectsClient();
      const spaces = await getSpacesWithAnalyticsEnabled(unsecureSavedObjectsClient);
      const taskManager = await this.getTaskManager();
      const esClient = await this.getESClient();

      // ── Ensure the three per-owner sync tasks are scheduled ────────────────
      // ensureScheduled is idempotent — safe to call on every hourly run.
      await scheduleOwnerSyncTasks({ taskManager, logger: this.logger });

      // ── Migrate: remove legacy per-space sync tasks (one-time) ─────────────
      let { migrationDone } = this.previousState;
      if (!migrationDone) {
        this.logger.info(
          '[scheduler-task] Removing legacy per-space analytics sync tasks (one-time migration).',
          { tags: ['cai-scheduler'] }
        );
        await this.removeLegacyPerSpaceTasks(taskManager, spaces);
        migrationDone = true;
        this.logger.info('[scheduler-task] Legacy per-space sync task migration complete.', {
          tags: ['cai-scheduler'],
        });
      }

      // ── Create analytics indexes for spaces whose indices are missing ───────
      for (const { spaceId, owner } of spaces) {
        const indices = getIndicesForOwnerAndSpace(spaceId, owner);
        const destIndicesExist = await esClient.indices.exists({ index: indices });
        if (!destIndicesExist) {
          createCasesAnalyticsIndexesForOwnerAndSpace({
            spaceId,
            owner,
            esClient,
            logger: this.logger,
            isServerless: this.isServerless,
            taskManager,
          }).catch(() => {
            this.logger.error(
              `Failed to create analytics indexes for owner ${owner} in space ${spaceId}`
            );
          });
        }
      }

      return { state: { migrationDone } };
    } catch (error) {
      this.logger.error(
        `Error occurred while running case analytics scheduler task: ${error.message}`
      );
    }
  }

  /**
   * Remove legacy per-space sync tasks created before the consolidation to
   * per-owner tasks.  Task IDs follow the pattern
   * `cai_cases_analytics_sync_{spaceId}_{owner}`.
   *
   * Best-effort: individual failures are logged but do not abort the migration.
   */
  private async removeLegacyPerSpaceTasks(
    taskManager: TaskManagerStartContract,
    spaces: OwnerSpacePair[]
  ): Promise<void> {
    const removals = spaces.map(({ spaceId, owner }) => {
      const taskId = getSynchronizationTaskId(spaceId, owner as Owner);
      return taskManager.removeIfExists(taskId).catch((err: Error) => {
        this.logger.warn(`[scheduler-task] Failed to remove legacy task ${taskId}: ${err.message}`);
      });
    });

    await Promise.all(removals);
    this.logger.debug(
      `[scheduler-task] Attempted removal of ${removals.length} legacy per-space sync task(s).`,
      { tags: ['cai-scheduler'] }
    );
  }

  public async cancel() {
    this.logger.debug('Cancelling case analytics scheduler task.');
  }
}
