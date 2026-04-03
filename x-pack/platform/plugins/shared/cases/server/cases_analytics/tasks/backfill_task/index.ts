/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type {
  CoreSetup,
  ElasticsearchClient,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Owner } from '../../../../common/constants/types';
import type { ConfigType } from '../../../config';
import {
  ANALYTICS_BACKFILL_TASK_TYPE,
  CASE_CONFIGURE_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
} from '../../../../common/constants';
import type { CasesServerStartDependencies } from '../../../types';
import { CaseAnalyticsIndexBackfillTaskFactory } from './backfill_task_factory';
import { BACKFILL_RUN_AT } from './constants';

export function registerCAIBackfillTask({
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
    const internalRepository = savedObjects.createInternalRepository([
      CASE_SAVED_OBJECT,
      CASE_CONFIGURE_SAVED_OBJECT,
    ]);
    return new SavedObjectsClient(internalRepository);
  };

  taskManager.registerTaskDefinitions({
    [ANALYTICS_BACKFILL_TASK_TYPE]: {
      title: 'Backfill cases analytics indexes.',
      maxAttempts: 3,
      createTaskRunner: (context: RunContext) => {
        return new CaseAnalyticsIndexBackfillTaskFactory({
          getESClient,
          getUnsecureSavedObjectsClient,
          logger,
          analyticsConfig,
        }).create(context);
      },
    },
  });
}

export async function scheduleCAIBackfillTask({
  taskId,
  sourceIndex,
  sourceQuery,
  destIndex,
  spaceId,
  owner,
  taskManager,
  logger,
}: {
  taskId: string;
  sourceIndex: string;
  sourceQuery: QueryDslQueryContainer;
  destIndex: string;
  spaceId: string;
  owner: Owner;
  taskManager: TaskManagerStartContract;
  logger: Logger;
}) {
  try {
    await taskManager.ensureScheduled({
      id: taskId,
      taskType: ANALYTICS_BACKFILL_TASK_TYPE,
      params: { sourceIndex, destIndex, sourceQuery, spaceId, owner },
      runAt: new Date(Date.now() + BACKFILL_RUN_AT),
      state: {},
    });
  } catch (e) {
    logger.error(`Error scheduling ${taskId} task, received ${e.message}`);
  }
}
