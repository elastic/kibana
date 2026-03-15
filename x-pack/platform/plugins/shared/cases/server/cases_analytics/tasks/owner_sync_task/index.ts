/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  IntervalSchedule,
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { CoreSetup, ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { ConfigType } from '../../../config';
import {
  ANALYTICS_OWNER_SYNC_TASK_TYPE,
  CASE_CONFIGURE_SAVED_OBJECT,
} from '../../../../common/constants';
import type { Owner } from '../../../../common/constants/types';
import { OWNERS } from '../../../../common/constants/owners';
import type { CasesServerStartDependencies } from '../../../types';
import { OwnerSyncTaskFactory } from './owner_sync_task_factory';

/**
 * Each per-owner task runs on a 5-minute interval.  Idle spaces are handled
 * in-task (skipped when nextSyncAt > now); this schedule is not changed when
 * a space enters idle mode.
 */
const SCHEDULE: IntervalSchedule = { interval: '5m' };

export function registerOwnerSyncTask({
  taskManager,
  logger,
  core,
  analyticsConfig,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  core: CoreSetup<CasesServerStartDependencies>;
  analyticsConfig: ConfigType['analytics'];
}) {
  const getESClient = async (): Promise<ElasticsearchClient> => {
    const [{ elasticsearch }] = await core.getStartServices();
    return elasticsearch.client.asInternalUser;
  };

  const getUnsecureSavedObjectsClient = async (): Promise<SavedObjectsClientContract> => {
    const [{ savedObjects }] = await core.getStartServices();
    const repo = savedObjects.createInternalRepository([CASE_CONFIGURE_SAVED_OBJECT]);
    return new SavedObjectsClient(repo);
  };

  taskManager.registerTaskDefinitions({
    [ANALYTICS_OWNER_SYNC_TASK_TYPE]: {
      title: 'Cases analytics per-owner sync task',
      createTaskRunner: (context: RunContext) => {
        return new OwnerSyncTaskFactory({
          getESClient,
          getUnsecureSavedObjectsClient,
          logger,
          analyticsConfig,
        }).create(context);
      },
    },
  });
}

/**
 * Returns the deterministic task ID for the given owner's sync task.
 * There is exactly one task per owner (not per space), so the ID has no space segment.
 */
export function getOwnerSyncTaskId(owner: Owner): string {
  return `cai_cases_analytics_owner_sync_${owner}`;
}

/**
 * Idempotently ensure all three per-owner sync tasks are scheduled.
 * Safe to call on every Kibana start; Task Manager deduplicates by ID.
 */
export async function scheduleOwnerSyncTasks({
  taskManager,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
}) {
  for (const owner of OWNERS) {
    const taskId = getOwnerSyncTaskId(owner as Owner);
    try {
      await taskManager.ensureScheduled({
        id: taskId,
        taskType: ANALYTICS_OWNER_SYNC_TASK_TYPE,
        params: { owner },
        schedule: SCHEDULE,
        state: { spaceStates: {} },
      });
      logger.debug(`[owner-sync-task] Ensured scheduled: ${taskId}`, {
        tags: ['cai-owner-sync'],
      });
    } catch (e) {
      logger.error(`[owner-sync-task] Error scheduling ${taskId}: ${e.message}`);
    }
  }
}

export { OwnerSyncTaskRunner } from './owner_sync_task_runner';
export type { OwnerSyncTaskState } from './owner_sync_task_runner';
