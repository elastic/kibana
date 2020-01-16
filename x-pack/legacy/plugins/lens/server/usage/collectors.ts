/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { get } from 'lodash';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { TaskManagerStartContract } from '../../../../../plugins/task_manager/server';

import { LensUsage, LensTelemetryState } from './types';

export function registerLensUsageCollector(
  usageCollection: UsageCollectionSetup,
  taskManager: Promise<TaskManagerStartContract>
) {
  let isCollectorReady = false;
  taskManager.then(() => {
    // mark lensUsageCollector as ready to collect when the TaskManager is ready
    isCollectorReady = true;
  });
  const lensUsageCollector = usageCollection.makeUsageCollector({
    type: 'lens',
    fetch: async (): Promise<LensUsage> => {
      try {
        const docs = await getLatestTaskState(await taskManager);
        // get the accumulated state from the recurring task
        const state: LensTelemetryState = get(docs, '[0].state');

        const events = getDataByDate(state.byDate);
        const suggestions = getDataByDate(state.suggestionsByDate);

        return {
          ...state.saved,
          events_30_days: events.last30,
          events_90_days: events.last90,
          suggestion_events_30_days: suggestions.last30,
          suggestion_events_90_days: suggestions.last90,
        };
      } catch (err) {
        return {
          saved_overall_total: 0,
          saved_30_days_total: 0,
          saved_90_days_total: 0,
          saved_overall: {},
          saved_30_days: {},
          saved_90_days: {},

          events_30_days: {},
          events_90_days: {},
          suggestion_events_30_days: {},
          suggestion_events_90_days: {},
        };
      }
    },
    isReady: () => isCollectorReady,
  });

  usageCollection.registerCollector(lensUsageCollector);
}

function addEvents(prevEvents: Record<string, number>, newEvents: Record<string, number>) {
  Object.keys(newEvents).forEach(key => {
    prevEvents[key] = (prevEvents[key] || 0) + newEvents[key];
  });
}

async function getLatestTaskState(taskManager: TaskManagerStartContract) {
  try {
    const result = await taskManager.fetch({
      query: { bool: { filter: { term: { _id: `task:Lens-lens_telemetry` } } } },
    });
    return result.docs;
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

function getDataByDate(dates: Record<string, Record<string, number>>) {
  const byDate = Object.keys(dates || {}).map(dateStr => parseInt(dateStr, 10));

  const last30: Record<string, number> = {};
  const last90: Record<string, number> = {};

  const last30Timestamp = moment()
    .subtract(30, 'days')
    .unix();
  const last90Timestamp = moment()
    .subtract(90, 'days')
    .unix();

  byDate.forEach(dateKey => {
    if (dateKey >= last30Timestamp) {
      addEvents(last30, dates[dateKey]);
      addEvents(last90, dates[dateKey]);
    } else if (dateKey > last90Timestamp) {
      addEvents(last90, dates[dateKey]);
    }
  });

  return {
    last30,
    last90,
  };
}
