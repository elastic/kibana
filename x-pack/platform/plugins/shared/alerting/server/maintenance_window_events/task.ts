/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import {
  type CoreStart,
  type Logger,
  SavedObject,
  ISavedObjectsRepository,
} from '@kbn/core/server';
import type {
  IntervalSchedule,
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { nodeBuilder, nodeTypes } from '@kbn/es-query';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../../common';
import type { AlertingPluginsStart } from '../plugin';
import { MaintenanceWindowAttributes } from '../data/maintenance_window/types';
import {
  transformMaintenanceWindowAttributesToMaintenanceWindow,
  transformMaintenanceWindowToMaintenanceWindowAttributes,
} from '../application/maintenance_window/transforms';
import { generateMaintenanceWindowEvents } from '../application/maintenance_window/lib/generate_maintenance_window_events';
import { stateSchemaByVersion, emptyState, type LatestTaskStateSchema } from './task_state';

export const MAINTENANCE_WINDOW_EVENTS_TASK_TYPE = 'Maintenance-window-events';

export const MAINTENANCE_WINDOW_EVENTS_TASK_ID = `${MAINTENANCE_WINDOW_EVENTS_TASK_TYPE}-generator`;
export const SCHEDULE: IntervalSchedule = { interval: '1d' };

export function initializeMaintenanceWindowEventsGenerator(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>
) {
  console.log('initializeMaintenanceWindowEventsGenerator');
  registerMaintenanceWindowEventsGeneratorTask(logger, taskManager, coreStartServices);
}

export async function scheduleMaintenanceWindowEventsGenerator(
  logger: Logger,
  taskManager: TaskManagerStartContract
) {
  try {
    console.log('scheduleMaintenanceWindowEventsGenerator', {
      SCHEDULE,
      MAINTENANCE_WINDOW_EVENTS_TASK_ID,
    });
    await taskManager.ensureScheduled({
      id: MAINTENANCE_WINDOW_EVENTS_TASK_ID,
      taskType: MAINTENANCE_WINDOW_EVENTS_TASK_TYPE,
      schedule: SCHEDULE,
      state: emptyState,
      params: {},
    });
  } catch (e) {
    logger.error(`Error scheduling ${MAINTENANCE_WINDOW_EVENTS_TASK_ID}, received ${e.message}`);
  }
}

function registerMaintenanceWindowEventsGeneratorTask(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>
) {
  taskManager.registerTaskDefinitions({
    [MAINTENANCE_WINDOW_EVENTS_TASK_TYPE]: {
      title: 'Maintenance window events generator task',
      stateSchemaByVersion,
      createTaskRunner: eventsGeneratorTaskRunner(logger, coreStartServices),
    },
  });
}

function getMaintenanceWindowStatusFilter() {
  const running = nodeBuilder.is('maintenance-window.attributes.events', 'now');
  const upcoming = nodeBuilder.and([
    nodeTypes.function.buildNode(
      'not',
      nodeBuilder.is('maintenance-window.attributes.events', 'now')
    ),
    nodeBuilder.range('maintenance-window.attributes.events', 'gte', 'now'),
  ]);
  const finished = nodeBuilder.and([
    nodeTypes.function.buildNode(
      'not',
      nodeBuilder.range('maintenance-window.attributes.events', 'gte', 'now')
    ),
    nodeBuilder.range('maintenance-window.attributes.expirationDate', 'gte', 'now'),
  ]);

  return nodeBuilder.or([running, upcoming, finished]);
}

export function eventsGeneratorTaskRunner(
  logger: Logger,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>
) {
  return ({ taskInstance }: RunContext) => {
    const state = taskInstance.state as LatestTaskStateSchema;
    return {
      async run() {
        let totalMaintenanceWindowsWithGeneratedEvents = 0;
        try {
          const [{ savedObjects }] = await coreStartServices;

          const savedObjectsClient = savedObjects.createInternalRepository([
            MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
          ]);

          const startRangeDate = moment().startOf('day').utc().toISOString();
          const endRangeDate = moment().startOf('day').utc().add(1, 'week').toISOString();

          const startRangeFilter = nodeBuilder.range(
            'maintenance-window.attributes.expirationDate',
            'gte',
            startRangeDate
          );
          const endRangeFilter = nodeBuilder.range(
            'maintenance-window.attributes.expirationDate',
            'lte',
            endRangeDate
          );

          const statusFilter = getMaintenanceWindowStatusFilter();

          const filter = nodeBuilder.and([startRangeFilter, endRangeFilter, statusFilter]);

          const finder = savedObjectsClient.createPointInTimeFinder<MaintenanceWindowAttributes>({
            type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
            namespaces: ['*'],
            perPage: 1000,
            sortField: 'updatedAt',
            sortOrder: 'desc',
            filter,
          });

          let result: Array<SavedObject<MaintenanceWindowAttributes>> = [];
          for await (const findResults of finder.find()) {
            result = result.concat(findResults.saved_objects);
          }

          console.log('eventsGeneratorTaskRunner 0', {
            result,
            startRangeDate,
            endRangeDate,
            filter: JSON.stringify(filter),
          });

          await finder.close();

          const totalMaintenanceWindowsWithGeneratedEvents =
            await generateEventsAndUpdateMaintenanceWindowSavedObjects({
              logger,
              savedObjectsClient,
              maintenanceWindowsSO: result,
              startRangeDate,
            });

          const updatedState: LatestTaskStateSchema = {
            runs: state.runs + 1,
            total_mw_with_generated_events: totalMaintenanceWindowsWithGeneratedEvents,
          };

          console.log('eventsGeneratorTaskRunner 1', {
            updatedState,
          });

          return {
            state: updatedState,
            schedule: SCHEDULE,
          };
        } catch (e) {
          logger.warn(`Error executing maintenance windows events generator task: ${e.message}`);
          const updatedState: LatestTaskStateSchema = {
            runs: state.runs + 1,
            total_mw_with_generated_events: totalMaintenanceWindowsWithGeneratedEvents,
          };
          return {
            state: updatedState,
            schedule: SCHEDULE,
          };
        }
      },
    };
  };
}

interface GenerateEventsAndUpdateSO {
  logger: Logger;
  savedObjectsClient: ISavedObjectsRepository;
  maintenanceWindowsSO: Array<SavedObject<MaintenanceWindowAttributes>>;
  startRangeDate: string;
}

export async function generateEventsAndUpdateMaintenanceWindowSavedObjects({
  logger,
  savedObjectsClient,
  maintenanceWindowsSO,
  startRangeDate,
}: GenerateEventsAndUpdateSO) {
  const maintenanceWindows = maintenanceWindowsSO.map((savedObject) =>
    transformMaintenanceWindowAttributesToMaintenanceWindow({
      attributes: savedObject.attributes,
      id: savedObject.id,
    })
  );

  const mwWithGeneratedEvents = maintenanceWindows.map((maintenanceWindow) => {
    const {
      events: oldEvents,
      rRule,
      duration,
      expirationDate: oldExpirationDate,
    } = maintenanceWindow;

    if (rRule.interval) {
      const newExpirationDate = moment(startRangeDate).utc().add(1, 'year').toISOString();

      const newEvents = generateMaintenanceWindowEvents({
        rRule,
        expirationDate: newExpirationDate,
        duration,
        startDate: oldExpirationDate,
      });

      return {
        ...maintenanceWindow,
        expirationDate: newExpirationDate,
        events: [...oldEvents, ...newEvents],
      };
    }

    return maintenanceWindow;
  });

  console.log('generateEventsAndUpdateMaintenanceWindowSavedObjects 0', {
    maintenanceWindows,
    mwWithGeneratedEvents,
  });

  try {
    for (const mw of mwWithGeneratedEvents) {
      const updatedMaintenanceWindowAttributes =
        transformMaintenanceWindowToMaintenanceWindowAttributes({
          ...mw,
        });
      await savedObjectsClient.update<MaintenanceWindowAttributes>(
        MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
        mw.id,
        updatedMaintenanceWindowAttributes
      );
    }
  } catch (e) {
    logger.error(
      `Failed to update events in maintenance windows saved object". Error: ${e.message}`
    );
  }

  console.log('generateEventsAndUpdateMaintenanceWindowSavedObjects 1', {
    length: mwWithGeneratedEvents.length,
  });

  return mwWithGeneratedEvents.length;
}
