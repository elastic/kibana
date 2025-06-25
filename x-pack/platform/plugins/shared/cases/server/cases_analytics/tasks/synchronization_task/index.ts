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
import type { CoreSetup, ElasticsearchClient } from '@kbn/core/server';
import { ANALYTICS_SYNCHRONIZATION_TASK_TYPE } from '../../../../common/constants';
import type { CasesServerStartDependencies } from '../../../types';
import { AnalyticsIndexSynchronizationTaskFactory } from './synchronization_task_factory';

const SCHEDULE: IntervalSchedule = { interval: '5m' };

export function registerCAISynchronizationTask({
  taskManager,
  logger,
  core,
}: {
  taskManager: TaskManagerSetupContract;
  logger: Logger;
  core: CoreSetup<CasesServerStartDependencies>;
}) {
  const getESClient = async (): Promise<ElasticsearchClient> => {
    const [{ elasticsearch }] = await core.getStartServices();
    return elasticsearch.client.asInternalUser;
  };

  taskManager.registerTaskDefinitions({
    [ANALYTICS_SYNCHRONIZATION_TASK_TYPE]: {
      title: 'Synchronization for the cases analytics index',
      createTaskRunner: (context: RunContext) => {
        return new AnalyticsIndexSynchronizationTaskFactory({ getESClient, logger }).create(
          context
        );
      },
    },
  });
}

/**
 * @param {destIndex} string Should be a key of SYNCHRONIZATION_QUERIES_DICTIONARY
 */
export async function scheduleCAISynchronizationTask({
  taskId,
  sourceIndex,
  destIndex,
  taskManager,
  logger,
}: {
  taskId: string;
  sourceIndex: string;
  destIndex: string;
  taskManager: TaskManagerStartContract;
  logger: Logger;
}) {
  try {
    await taskManager.ensureScheduled({
      id: taskId,
      taskType: ANALYTICS_SYNCHRONIZATION_TASK_TYPE,
      params: { sourceIndex, destIndex },
      schedule: SCHEDULE, // every 5 minutes
      state: {},
    });
  } catch (e) {
    logger.error(`Error scheduling ${taskId} task, received ${e.message}`);
  }
}
