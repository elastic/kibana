/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  type ConcreteTaskInstance,
  type TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { SavedObjectsClientContract, Logger, ElasticsearchClient } from '@kbn/core/server';
import type { CancellableTask } from '@kbn/task-manager-plugin/server/task';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { ConfigType } from '../../../config';
import { getSpacesWithAnalyticsEnabled } from '../../utils';
import type { OwnerSpacePair } from '../../utils';
import { createCasesAnalyticsIndexesForOwnerAndSpace, getIndicesForOwnerAndSpace } from '../..';
import { scheduleOwnerSyncTasks } from '../owner_sync_task';
import { getSynchronizationTaskId } from '../synchronization_task';
import { createAnalyticsDataViews } from '../../data_views';
import type { Owner } from '../../../../common/constants/types';

interface SchedulerTaskRunnerFactoryConstructorParams {
  taskInstance: ConcreteTaskInstance;
  getUnsecureSavedObjectsClient: () => Promise<SavedObjectsClientContract>;
  logger: Logger;
  analyticsConfig: ConfigType['analytics'];
  getTaskManager: () => Promise<TaskManagerStartContract>;
  getESClient: () => Promise<ElasticsearchClient>;
  getDataViewsService: () => Promise<DataViewsService | undefined>;
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
  private readonly getDataViewsService: () => Promise<DataViewsService | undefined>;
  private readonly isServerless: boolean;
  private readonly previousState: SchedulerTaskState;

  constructor({
    taskInstance,
    getUnsecureSavedObjectsClient,
    logger,
    analyticsConfig,
    getTaskManager,
    getESClient,
    getDataViewsService,
    isServerless,
  }: SchedulerTaskRunnerFactoryConstructorParams) {
    this.previousState = (taskInstance.state as SchedulerTaskState) ?? {};
    this.getUnsecureSavedObjectsClient = getUnsecureSavedObjectsClient;
    this.logger = logger;
    this.analyticsConfig = analyticsConfig;
    this.getTaskManager = getTaskManager;
    this.getESClient = getESClient;
    this.getDataViewsService = getDataViewsService;
    this.isServerless = isServerless;
  }

  public async run() {
    const executionId = uuidv4();
    const startMs = Date.now();

    if (!this.analyticsConfig.index.enabled) {
      this.logger.debug('[scheduler-task] Analytics index is disabled, skipping scheduler task.', {
        executionId,
        tags: ['cai-scheduler'],
      });
      return;
    }

    this.logger.info('[scheduler-task] Starting analytics scheduler run', {
      executionId,
      tags: ['cai-scheduler'],
    });

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
          { executionId, tags: ['cai-scheduler'] }
        );
        await this.removeLegacyPerSpaceTasks(taskManager, spaces);
        migrationDone = true;
        this.logger.info('[scheduler-task] Legacy per-space sync task migration complete.', {
          executionId,
          tags: ['cai-scheduler'],
        });
      }

      // ── Create analytics indexes for spaces whose indices are missing ───────
      //
      // A single wildcard GET resolves every existing analytics index in one
      // round-trip, avoiding an O(N) sequential indices.exists loop that would
      // serialise up to 30 000 ES calls at 10 000 spaces × 3 owners scale.
      const existingIndicesResponse = await esClient.indices.get({
        index: '.internal.cases-analytics*',
        allow_no_indices: true,
        ignore_unavailable: true,
      });
      const existingIndexNames = new Set(Object.keys(existingIndicesResponse));

      // Belt-and-suspenders: cap index creation to maxAnalyticsEnabledSpaces even
      // if the PATCH-layer guard was bypassed (e.g. via a race or direct SO edit).
      const maxSpaces = this.analyticsConfig.index.maxAnalyticsEnabledSpaces;
      const boundedSpaces = spaces.length > maxSpaces ? spaces.slice(0, maxSpaces) : spaces;
      if (spaces.length > maxSpaces) {
        this.logger.warn(
          `[CAI Scheduler] ${spaces.length} owner-space pairs have analytics enabled but the ` +
            `configured maximum is ${maxSpaces}. Only the first ${maxSpaces} pairs will have ` +
            `indices created. Disable analytics for excess spaces or increase ` +
            `'xpack.cases.analytics.index.maxAnalyticsEnabledSpaces'.`,
          { executionId, tags: ['cai-scheduler'] }
        );
      }

      // Collect spaces that need new indices so we can provision data views for them.
      const spacesNeedingDataViews = new Set<string>();

      for (const { spaceId, owner } of boundedSpaces) {
        const indices = getIndicesForOwnerAndSpace(spaceId, owner);
        const destIndicesExist = indices.every((idx) => existingIndexNames.has(idx));
        if (!destIndicesExist) {
          spacesNeedingDataViews.add(spaceId);
          createCasesAnalyticsIndexesForOwnerAndSpace({
            spaceId,
            owner,
            esClient,
            logger: this.logger,
            isServerless: this.isServerless,
            taskManager,
          }).catch((err: Error) => {
            this.logger.error(
              `Failed to create analytics indexes for owner ${owner} in space ${spaceId}`,
              { error: err, executionId, tags: ['cai-scheduler'] }
            );
          });
        }
      }

      if (spacesNeedingDataViews.size > 0) {
        // Get the DataViewsService once and create data views for each space that
        // has newly provisioned indices.  Best-effort: failures are logged but do
        // not abort the scheduler run.
        this.getDataViewsService()
          .then((dataViewsService) => {
            if (!dataViewsService) return;
            for (const spaceId of spacesNeedingDataViews) {
              createAnalyticsDataViews(dataViewsService, this.logger, spaceId).catch(
                (err: Error) => {
                  this.logger.warn(
                    `[scheduler-task] Failed to create analytics data views in space ${spaceId}`,
                    { error: err, executionId, tags: ['cai-scheduler'] }
                  );
                }
              );
            }
          })
          .catch((err: Error) => {
            this.logger.warn(
              '[scheduler-task] Failed to obtain DataViewsService for data view provisioning',
              { error: err, executionId, tags: ['cai-scheduler'] }
            );
          });
      }

      this.logger.info('[scheduler-task] Analytics scheduler run complete', {
        executionId,
        durationMs: Date.now() - startMs,
        tags: ['cai-scheduler'],
      });

      return { state: { migrationDone } };
    } catch (error) {
      this.logger.error('[scheduler-task] Error running analytics scheduler task', {
        error,
        executionId,
        tags: ['cai-scheduler'],
      });
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
        this.logger.warn(`[scheduler-task] Failed to remove legacy task ${taskId}`, { error: err, taskId, tags: ['cai-scheduler'] });
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
