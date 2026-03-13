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
  ANALYTICS_SYNCHRONIZATION_TASK_TYPE,
  CASE_CONFIGURE_SAVED_OBJECT,
} from '../../../../common/constants';
import type { Owner } from '../../../../common/constants/types';
import type { CasesServerStartDependencies } from '../../../types';
import { AnalyticsIndexSynchronizationTaskFactory } from './synchronization_task_factory';

const SCHEDULE: IntervalSchedule = { interval: '5m' };

export function registerCAISynchronizationTask({
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
    const internalSavedObjectsRepository = savedObjects.createInternalRepository([
      CASE_CONFIGURE_SAVED_OBJECT,
    ]);
    return new SavedObjectsClient(internalSavedObjectsRepository);
  };

  taskManager.registerTaskDefinitions({
    [ANALYTICS_SYNCHRONIZATION_TASK_TYPE]: {
      title: 'Synchronization for the cases analytics index',
      createTaskRunner: (context: RunContext) => {
        return new AnalyticsIndexSynchronizationTaskFactory({
          getESClient,
          getUnsecureSavedObjectsClient,
          logger,
          analyticsConfig,
        }).create(context);
      },
    },
  });
}

export function getSynchronizationTaskId(spaceId: string, owner: Owner): string {
  return `cai_cases_analytics_sync_${spaceId}_${owner}`;
}

export async function scheduleCAISynchronizationTask({
  taskManager,
  logger,
  spaceId,
  owner,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
  spaceId: string;
  owner: Owner;
}) {
  const taskId = getSynchronizationTaskId(spaceId, owner);
  try {
    await taskManager.ensureScheduled({
      id: taskId,
      taskType: ANALYTICS_SYNCHRONIZATION_TASK_TYPE,
      params: { owner, spaceId },
      schedule: SCHEDULE, // every 5 minutes
      state: {},
    });
  } catch (e) {
    logger.error(`Error scheduling ${taskId} task, received ${e.message}`);
  }
}
