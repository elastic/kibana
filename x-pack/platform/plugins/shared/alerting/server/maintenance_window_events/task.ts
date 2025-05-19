/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import type {
  SavedObject,
  ISavedObjectsRepository,
  ISavedObjectsPointInTimeFinder,
} from '@kbn/core/server';
import { type CoreStart, type Logger } from '@kbn/core/server';
import type {
  IntervalSchedule,
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder, nodeTypes } from '@kbn/es-query';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '../../common';
import type { AlertingPluginsStart } from '../plugin';
import type { MaintenanceWindowAttributes } from '../data/maintenance_window/types';
import {
  transformMaintenanceWindowAttributesToMaintenanceWindow,
  transformMaintenanceWindowToMaintenanceWindowAttributes,
} from '../application/maintenance_window/transforms';
import { generateMaintenanceWindowEvents } from '../application/maintenance_window/lib/generate_maintenance_window_events';
import { stateSchemaByVersion, emptyState, type LatestTaskStateSchema } from './task_state';

export const MAINTENANCE_WINDOW_EVENTS_TASK_TYPE = 'maintenance-window:generate-events';

export const MAINTENANCE_WINDOW_EVENTS_TASK_ID = `${MAINTENANCE_WINDOW_EVENTS_TASK_TYPE}-generator`;
export const SCHEDULE: IntervalSchedule = { interval: '1d' };

export function initializeMaintenanceWindowEventsGenerator(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>
) {
  registerMaintenanceWindowEventsGeneratorTask(logger, taskManager, coreStartServices);
}

export async function scheduleMaintenanceWindowEventsGenerator(
  logger: Logger,
  taskManager: TaskManagerStartContract
) {
  try {
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
      createTaskRunner: createEventsGeneratorTaskRunner(logger, coreStartServices),
    },
  });
}

export function createEventsGeneratorTaskRunner(
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

          const statusFilter = getStatusFilter();

          const filter = nodeBuilder.and([startRangeFilter, endRangeFilter, statusFilter]);

          totalMaintenanceWindowsWithGeneratedEvents = await updateMaintenanceWindowsEvents({
            filter,
            savedObjectsClient,
            logger,
            startRangeDate,
          });

          const updatedState: LatestTaskStateSchema = {
            runs: state.runs + 1,
            total_mw_with_generated_events: totalMaintenanceWindowsWithGeneratedEvents,
          };
          logger.info(
            `Maintenance windows events generator task updated ${updatedState.total_mw_with_generated_events} maintenance windows successfully`
          );

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

export function getStatusFilter() {
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

export async function getSOFinder({
  savedObjectsClient,
  logger,
  filter,
}: {
  logger: Logger;
  savedObjectsClient: ISavedObjectsRepository;
  filter: KueryNode;
}): Promise<ISavedObjectsPointInTimeFinder<MaintenanceWindowAttributes, unknown> | null> {
  try {
    return savedObjectsClient.createPointInTimeFinder<MaintenanceWindowAttributes>({
      type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
      namespaces: ['*'],
      perPage: 1000,
      sortField: 'updatedAt',
      sortOrder: 'desc',
      filter,
    });
  } catch (e) {
    logger.error(`Failed to find maintenance windows saved object". Error: ${e.message}`);
    return null;
  }
}

export async function generateEvents({
  maintenanceWindowsSO,
  startRangeDate,
}: {
  maintenanceWindowsSO: Array<SavedObject<MaintenanceWindowAttributes>>;
  startRangeDate: string;
}) {
  const maintenanceWindows = maintenanceWindowsSO.map((savedObject) =>
    transformMaintenanceWindowAttributesToMaintenanceWindow({
      attributes: savedObject.attributes,
      id: savedObject.id,
    })
  );

  const newExpirationDate = moment(startRangeDate).utc().add(1, 'year').toISOString();

  const mwWithGeneratedEvents = maintenanceWindows
    // filtering the maintenance windows that have recurring schedule and events
    .filter(
      (maintenanceWindow) =>
        (maintenanceWindow.rRule.interval !== undefined ||
          maintenanceWindow.rRule.freq !== undefined) &&
        maintenanceWindow.events.length
    )
    .map((filteredMaintenanceWindow) => {
      const { rRule, duration, expirationDate: oldExpirationDate } = filteredMaintenanceWindow;

      const newEvents = generateMaintenanceWindowEvents({
        rRule,
        expirationDate: newExpirationDate,
        duration,
        startDate: startRangeDate, // here start range date is 1 week before current expiration date
      });

      return {
        ...filteredMaintenanceWindow,
        expirationDate: newEvents.length ? newExpirationDate : oldExpirationDate,
        events: [...newEvents],
      };
    })
    .filter((mappedMW) => mappedMW.expirationDate === newExpirationDate);

  return mwWithGeneratedEvents;
}

export const updateMaintenanceWindowsEvents = async ({
  filter,
  savedObjectsClient,
  logger,
  startRangeDate,
}: {
  logger: Logger;
  savedObjectsClient: ISavedObjectsRepository;
  filter: KueryNode;
  startRangeDate: string;
}) => {
  let totalUpdatedMaintenanceWindows = 0;
  let mwsWithNewEvents = [];
  const soFinder = await getSOFinder({
    savedObjectsClient,
    logger,
    filter,
  });

  if (soFinder) {
    for await (const findResults of soFinder.find()) {
      mwsWithNewEvents = await generateEvents({
        maintenanceWindowsSO: findResults.saved_objects,
        startRangeDate,
      });

      try {
        if (mwsWithNewEvents.length) {
          const bulkUpdateReq = mwsWithNewEvents.map((mw) => {
            const updatedMaintenanceWindowAttributes =
              transformMaintenanceWindowToMaintenanceWindowAttributes({
                ...mw,
              });

            return {
              type: MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
              id: mw.id,
              attributes: updatedMaintenanceWindowAttributes,
            };
          });

          const result = await savedObjectsClient.bulkUpdate<MaintenanceWindowAttributes>(
            bulkUpdateReq
          );

          totalUpdatedMaintenanceWindows =
            totalUpdatedMaintenanceWindows + result.saved_objects.length;
        }
      } catch (e) {
        logger.error(
          `Failed to update events in maintenance windows saved object". Error: ${e.message}`
        );
      }
    }

    await soFinder.close();
  }

  logger.debug(`Total updated maintenance windows "${totalUpdatedMaintenanceWindows}"`);

  return totalUpdatedMaintenanceWindows;
};
