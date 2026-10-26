/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom, map } from 'rxjs';

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import type { ICollector } from '@kbn/usage-collection-plugin/server/collector/types';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { get } from 'lodash';
import type { ReportingCore } from '..';
import { ReportingSchema } from './collection_schema';
import { TASK_ID } from './task';
import type { ReportingUsage } from './types';

export type ReportingUsageType = ReportingUsage & {
  available: boolean;
  enabled: boolean;
};

async function getLatestTaskState(taskManager: TaskManagerStartContract) {
  try {
    const result = await taskManager.get(TASK_ID);
    return result;
  } catch (err) {
    const errMessage = err && err.message ? err.message : err.toString();
    /*
      The usage service WILL to try to fetch from this collector before the task manager has been initialized, because the
      task manager has to wait for all plugins to initialize first. It's fine to ignore it as next time around it will be
      initialized (or it will throw a different type of error)
    */
    if (!errMessage.includes('NotInitialized')) {
      throw err;
    }
  }

  return null;
}

export function registerReportingUsageCollector(
  reporting: ReportingCore,
  taskManager: Promise<TaskManagerStartContract>,
  usageCollection: UsageCollectionSetup
) {
  const isReportingReady = reporting.pluginStartsUp.bind(reporting);

  const getLicense = async () => {
    const { licensing } = await reporting.getPluginStartDeps();
    return await firstValueFrom(
      licensing.license$.pipe(map(({ isAvailable }) => ({ isAvailable })))
    );
  };

  const collector: ICollector<ReportingUsageType> =
    usageCollection.makeUsageCollector<ReportingUsageType>({
      type: 'reporting',
      fetch: async () => {
        const license = await getLicense();

        try {
          const doc = await getLatestTaskState(await taskManager);
          // get the accumulated state from the recurring task
          const { runs, ...state } = get(doc, 'state') as ReportingUsage & { runs: number };

          return {
            available: license.isAvailable === true, // is available under all non-expired licenses
            enabled: true, // is enabled, by nature of this code path executing
            ...state,
          };
        } catch (err) {
          const errMessage = err && err.message ? err.message : err.toString();
          return {
            available: license.isAvailable === true, // is available under all non-expired licenses
            enabled: true, // is enabled, by nature of this code path executing
            has_errors: true,
            error_messages: [errMessage],
            number_of_scheduled_reports: 0,
            number_of_enabled_scheduled_reports: 0,
            number_of_scheduled_reports_by_type: {},
            number_of_enabled_scheduled_reports_by_type: {},
            number_of_scheduled_reports_with_notifications: 0,
          };
        }
      },
      isReady: async () => {
        await taskManager;
        return isReportingReady();
      },
      schema: ReportingSchema,
    });

  usageCollection.registerCollector(collector);
}
