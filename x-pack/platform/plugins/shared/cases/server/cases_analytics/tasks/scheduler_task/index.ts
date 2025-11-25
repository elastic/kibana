/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { SavedObjectsClientContract, CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { ConfigType } from '../../../config';
import { ANALYTICS_SCHEDULER_TASK_TYPE, CASE_SAVED_OBJECT } from '../../../../common/constants';
import type { CasesServerStartDependencies } from '../../../types';
import { AnalyticsIndexSchedulerTaskFactory } from './scheduler_task_factory';
import { CAI_SCHEDULER_TASK_ID } from './constants';

export function registerCAISchedulerTask({
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
  const getUnsecureSavedObjectsClient = async (): Promise<SavedObjectsClientContract> => {
    const [{ savedObjects }] = await core.getStartServices();
    const internalSavedObjectsRepository = savedObjects.createInternalRepository([
      CASE_SAVED_OBJECT,
    ]);
    return new SavedObjectsClient(internalSavedObjectsRepository);
  };
  const getTaskManager = async (): Promise<TaskManagerStartContract> => {
    const plugins = await core.plugins.onStart<{ taskManager: TaskManagerStartContract }>(
      'taskManager'
    );
    if (plugins.taskManager.found) {
      return plugins.taskManager.contract;
    }
    throw new Error('Could not get taskManager start contract');
  };
  const getESClient = async (): Promise<ElasticsearchClient> => {
    const [{ elasticsearch }] = await core.getStartServices();
    return elasticsearch.client.asInternalUser;
  };

  taskManager.registerTaskDefinitions({
    [ANALYTICS_SCHEDULER_TASK_TYPE]: {
      title: 'Schedules cases analytics synchronization tasks.',
      maxAttempts: 3,
      createTaskRunner: () => {
        return new AnalyticsIndexSchedulerTaskFactory({
          getUnsecureSavedObjectsClient,
          getTaskManager,
          logger,
          analyticsConfig,
          getESClient,
        }).create();
      },
    },
  });
}

export async function scheduleCAISchedulerTask({
  taskManager,
  logger,
}: {
  taskManager: TaskManagerStartContract;
  logger: Logger;
}) {
  try {
    await taskManager.ensureScheduled({
      id: CAI_SCHEDULER_TASK_ID,
      taskType: ANALYTICS_SCHEDULER_TASK_TYPE,
      params: {},
      runAt: new Date(Date.now() + 60 * 1000),
      schedule: {
        interval: '1h',
      },
      state: {},
    });
  } catch (e) {
    logger.error(`Error scheduling ${CAI_SCHEDULER_TASK_ID} task, received ${e.message}`);
  }
}
