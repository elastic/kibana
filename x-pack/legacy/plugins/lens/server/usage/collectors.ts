/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { get } from 'lodash';
import { Server, KibanaConfig } from 'src/legacy/server/kbn_server';
import { CoreSetup, SavedObjectsLegacyService } from 'src/core/server';
import { LensUsage, LensTelemetryState } from './types';

export function registerLensUsageCollector(
  core: CoreSetup,
  plugins: {
    savedObjects: SavedObjectsLegacyService;
    usage: {
      collectorSet: {
        makeUsageCollector: (options: unknown) => unknown;
        register: (options: unknown) => unknown;
      };
    };
    config: KibanaConfig;
    server: Server;
  }
) {
  let isCollectorReady = false;
  async function determineIfTaskManagerIsReady() {
    let isReady = false;
    try {
      isReady = await isTaskManagerReady(plugins.server);
    } catch (err) {} // eslint-disable-line

    if (isReady) {
      isCollectorReady = true;
    } else {
      setTimeout(determineIfTaskManagerIsReady, 500);
    }
  }
  determineIfTaskManagerIsReady();

  const lensUsageCollector = plugins.usage.collectorSet.makeUsageCollector({
    type: 'lens',
    fetch: async (): Promise<LensUsage> => {
      try {
        const docs = await getLatestTaskState(plugins.server);
        // get the accumulated state from the recurring task
        const state: LensTelemetryState = get(docs, '[0].state');

        const dates = Object.keys(state.byDate || {}).map(dateStr => parseInt(dateStr, 10));
        const suggestionDates = Object.keys(state.suggestionsByDate || {}).map(dateStr =>
          parseInt(dateStr, 10)
        );

        const eventsLast30: Record<string, number> = {};
        const eventsLast90: Record<string, number> = {};
        const suggestionsLast30: Record<string, number> = {};
        const suggestionsLast90: Record<string, number> = {};

        const last30 = moment()
          .subtract(30, 'days')
          .unix();
        const last90 = moment()
          .subtract(90, 'days')
          .unix();

        dates.forEach(date => {
          if (date >= last30) {
            addEvents(eventsLast30, state.byDate[date]);
            addEvents(eventsLast90, state.byDate[date]);
          } else if (date > last90) {
            addEvents(eventsLast90, state.byDate[date]);
          }
        });

        suggestionDates.forEach(date => {
          if (date >= last30) {
            addEvents(suggestionsLast30, state.suggestionsByDate[date]);
            addEvents(suggestionsLast90, state.suggestionsByDate[date]);
          } else if (date > last90) {
            addEvents(suggestionsLast90, state.suggestionsByDate[date]);
          }
        });

        return {
          ...state.saved,
          events_30_days: eventsLast30,
          events_90_days: eventsLast90,
          suggestion_events_30_days: suggestionsLast30,
          suggestion_events_90_days: suggestionsLast90,
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
  plugins.usage.collectorSet.register(lensUsageCollector);
}

function addEvents(prevEvents: Record<string, number>, newEvents: Record<string, number>) {
  Object.keys(newEvents).forEach(key => {
    prevEvents[key] = prevEvents[key] || 0 + newEvents[key];
  });
}

async function isTaskManagerReady(server: Server) {
  return (await getLatestTaskState(server)) !== null;
}

async function getLatestTaskState(server: Server) {
  const taskManager = server.plugins.task_manager!;

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
