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
  StartServicesAccessor,
} from '@kbn/core/server';
import { type Logger } from '@kbn/core/server';
import type {
  IntervalSchedule,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { KueryNode } from '@kbn/es-query';
import { fromKueryExpression, nodeBuilder } from '@kbn/es-query';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE, MaintenanceWindowStatus } from '../../common';
import type { MaintenanceWindowAttributes } from '../data/types/maintenance_window_attributes';
import {
  transformMaintenanceWindowAttributesToMaintenanceWindow,
  transformMaintenanceWindowToMaintenanceWindowAttributes,
} from '../application/transforms';
import type { MaintenanceWindowsServerStartDependencies } from '../types';
import { getMaintenanceWindowStatus } from '../application/lib/get_maintenance_window_status';
import { generateMaintenanceWindowEvents } from '../application/lib/generate_maintenance_window_events';

export const MAINTENANCE_WINDOW_EVENTS_TASK_TYPE = 'maintenance-window:generate-events';

export const MAINTENANCE_WINDOW_EVENTS_TASK_ID = `${MAINTENANCE_WINDOW_EVENTS_TASK_TYPE}-generator`;
export const SCHEDULE: IntervalSchedule = { interval: '1d' };

export function initializeMaintenanceWindowEventsGenerator(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  coreStartServices: StartServicesAccessor<MaintenanceWindowsServerStartDependencies, unknown>
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
      state: {},
      params: {},
    });
  } catch (e) {
    logger.error(`Error scheduling ${MAINTENANCE_WINDOW_EVENTS_TASK_ID}, received ${e.message}`);
  }
}

function registerMaintenanceWindowEventsGeneratorTask(
  logger: Logger,
  taskManager: TaskManagerSetupContract,
  coreStartServices: StartServicesAccessor<MaintenanceWindowsServerStartDependencies, unknown>
) {
  taskManager.registerTaskDefinitions({
    [MAINTENANCE_WINDOW_EVENTS_TASK_TYPE]: {
      title: 'Maintenance window events generator task',
      createTaskRunner: createEventsGeneratorTaskRunner(logger, coreStartServices),
      timeout: '30m',
    },
  });
}

export function createEventsGeneratorTaskRunner(
  logger: Logger,
  coreStartServices: StartServicesAccessor<MaintenanceWindowsServerStartDependencies, unknown>
) {
  return () => {
    let cancelled = false;
    let soFinder: ISavedObjectsPointInTimeFinder<MaintenanceWindowAttributes, unknown> | null;

    return {
      async run() {
        try {
          const [{ savedObjects }] = await coreStartServices();

          const savedObjectsClient = savedObjects.createInternalRepository([
            MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE,
          ]);

          // we are using total 2 weeks range to find maintenance windows that are expiring
          const startRangeDate = moment().startOf('day').utc().subtract(1, 'week').toISOString(); // 1 week before current date
          const endRangeDate = moment().startOf('day').utc().add(1, 'week').toISOString(); // 1 week after current date

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

          soFinder = getSOFinder({
            savedObjectsClient,
            logger,
            filter,
          });

          const totalMaintenanceWindowsWithGeneratedEvents = await updateMaintenanceWindowsEvents({
            savedObjectsClient,
            logger,
            startRangeDate,
            soFinder,
          });

          logger.debug(
            `Maintenance windows events generator task updated ${totalMaintenanceWindowsWithGeneratedEvents} maintenance windows successfully`
          );
        } catch (e) {
          logger.warn(`Error executing maintenance windows events generator task: ${e.message}`);
        }
      },
      async cancel() {
        if (cancelled) {
          return;
        }

        logger.debug(
          `Cancelling maintenance windows events generator task - execution error due to timeout.`
        );

        cancelled = true;

        await soFinder?.close();

        return;
      },
    };
  };
}

export function getStatusFilter() {
  const mwStatusQuery = getMaintenanceWindowStatus();

  const fullQuery = [
    MaintenanceWindowStatus.Running,
    MaintenanceWindowStatus.Upcoming,
    MaintenanceWindowStatus.Finished,
  ]
    .map((value) => mwStatusQuery[value])
    .filter(Boolean)
    .join(' or ');

  return fromKueryExpression(fullQuery);
}

export const updateMaintenanceWindowsEvents = async ({
  soFinder,
  savedObjectsClient,
  logger,
  startRangeDate,
}: {
  logger: Logger;
  savedObjectsClient: ISavedObjectsRepository;
  soFinder: ISavedObjectsPointInTimeFinder<MaintenanceWindowAttributes, unknown> | null;
  startRangeDate: string;
}) => {
  let totalUpdatedMaintenanceWindows = 0;
  let mwsWithNewEvents = [];
  let mwSOWithErrors = 0;

  if (soFinder) {
    for await (const findResults of soFinder.find()) {
      try {
        mwsWithNewEvents = await generateEvents({
          maintenanceWindowsSO: findResults.saved_objects,
          startRangeDate,
        });

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

          for (const savedObject of result.saved_objects) {
            if (savedObject.error) {
              logger.error(
                `MW event generator: Failed to update maintenance window "${savedObject.id}". Error: ${savedObject.error.message}`
              );
              mwSOWithErrors++;
            }
          }

          totalUpdatedMaintenanceWindows =
            totalUpdatedMaintenanceWindows + (result.saved_objects.length - mwSOWithErrors);
        }
      } catch (e) {
        logger.error(
          `MW event generator: Failed to update events in maintenance windows saved object". Error: ${e.message}`
        );
      }
    }

    await soFinder.close();
  }

  logger.debug(`Total updated maintenance windows "${totalUpdatedMaintenanceWindows}"`);

  return totalUpdatedMaintenanceWindows;
};

export function getSOFinder({
  savedObjectsClient,
  logger,
  filter,
}: {
  logger: Logger;
  savedObjectsClient: ISavedObjectsRepository;
  filter: KueryNode;
}): ISavedObjectsPointInTimeFinder<MaintenanceWindowAttributes, unknown> | null {
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
    logger.error(
      `MW event generator: Failed instantiate a createPointInTimeFinder instance". Error: ${e.message}`
    );
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

  // 1 year from the task run date (current date) till the end of the day
  const newExpirationDate = moment().utc().endOf('day').add(1, 'year').toISOString();

  try {
    const mwWithGeneratedEvents = maintenanceWindows
      // filtering the maintenance windows that have recurring schedule and events
      .filter(
        (maintenanceWindow) =>
          (maintenanceWindow.rRule.interval !== undefined ||
            maintenanceWindow.rRule.freq !== undefined) &&
          maintenanceWindow.events.length
      )
      .map((filteredMaintenanceWindow) => {
        const { schedule, expirationDate: oldExpirationDate } = filteredMaintenanceWindow;

        const newEvents = generateMaintenanceWindowEvents({
          schedule: schedule.custom,
          expirationDate: newExpirationDate,
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
  } catch (e) {
    throw new Error(`Failed to generate events for maintenance windows. Error: ${e.message}`);
  }
}
