/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { AlertingServerStartDependencies } from '../../types';
import { TASK_ID } from './task_definition';
import type { LatestTaskStateSchema } from './task_state';
import type { AlertingV2Usage } from './types';
import { AlertingV2UsageCollectorSchema } from './usage_collector_schema';

async function getLatestTaskState(taskManager: AlertingServerStartDependencies['taskManager']) {
  try {
    const result = await taskManager.get(TASK_ID);
    return result;
  } catch (err) {
    const errMessage = err && err.message ? err.message : err.toString();
    /*
      The usage service will try to fetch from this collector before the task manager has been initialized, because the
      task manager has to wait for all plugins to initialize first. It's fine to ignore it as next time around it will be
      initialized (or it will throw a different type of error)
    */
    if (!errMessage.includes('NotInitialized')) {
      throw err;
    }
  }

  return null;
}

export function registerAlertingV2UsageCollector(
  getTaskManager: () => AlertingServerStartDependencies['taskManager'],
  usageCollection: UsageCollectionSetup
) {
  const collector = usageCollection.makeUsageCollector<AlertingV2Usage>({
    type: 'alerting_v2',
    fetch: async () => {
      try {
        const taskManager = getTaskManager();
        const doc = await getLatestTaskState(taskManager);
        const { runs: _runs, ...state } = get(doc, 'state') as LatestTaskStateSchema;

        return state;
      } catch (err) {
        const errorMessage = err && err.message ? err.message : err.toString();
        return {
          has_errors: true,
          error_messages: [errorMessage],
        };
      }
    },
    isReady: () => true,
    schema: AlertingV2UsageCollectorSchema,
  });

  usageCollection.registerCollector(collector);
}
