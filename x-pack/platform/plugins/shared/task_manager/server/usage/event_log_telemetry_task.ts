/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CoreStart } from '@kbn/core-lifecycle-server';
import type { TaskScheduling } from '../task_scheduling';
import type { TaskTypeDictionary } from '../task_type_dictionary';
import { TaskCost, type RunContext } from '../task';
import type { TaskManagerStartContract } from '..';
import type { TaskManagerPluginsStart } from '../plugin';
import { getEventLogStats } from './lib/get_event_log_stats';
import { emptyState, stateSchemaByVersion, type LatestTaskStateSchema } from './task_state';
import { SCHEDULE, TASK_ID, TASK_TIMEOUT, TASK_TYPE } from './constants';

type CoreStartServices = () => Promise<
  [CoreStart, TaskManagerPluginsStart, TaskManagerStartContract]
>;

/**
 * Schedules the single cluster-wide snapshot telemetry task. Task Manager keys the task by id, so
 * only one Kibana in the fleet runs the aggregation regardless of how many call this.
 */
export async function scheduleEventLogTelemetryTask(
  logger: Logger,
  taskScheduling: TaskScheduling
) {
  try {
    await taskScheduling.ensureScheduled({
      id: TASK_ID,
      taskType: TASK_TYPE,
      schedule: SCHEDULE,
      state: emptyState,
      params: {},
    });
  } catch (e) {
    logger.error(`Error scheduling ${TASK_ID} task, received ${e.message}`);
  }
}

export function registerEventLogTelemetryTask(
  logger: Logger,
  coreStartServices: CoreStartServices,
  taskTypeDictionary: TaskTypeDictionary
) {
  taskTypeDictionary.registerTaskDefinitions({
    [TASK_TYPE]: {
      title: 'Task Manager snapshot telemetry fetch task',
      description:
        'Aggregates cluster-wide task execution volume and schedule delay from the event log, ' +
        'storing the result in task state for the Task Manager usage collector to report.',
      timeout: TASK_TIMEOUT,
      cost: TaskCost.Normal,
      stateSchemaByVersion,
      createTaskRunner: taskRunner(logger, coreStartServices),
    },
  });
}

export function taskRunner(logger: Logger, coreStartServices: CoreStartServices) {
  return ({ taskInstance, signal }: RunContext) => {
    const state = taskInstance.state as LatestTaskStateSchema;

    return {
      async run() {
        try {
          const [{ elasticsearch }] = await coreStartServices();
          const stats = await getEventLogStats(elasticsearch.client.asInternalUser, signal);

          const updatedState: LatestTaskStateSchema = {
            has_errors: false,
            error_messages: undefined,
            runs: (state.runs ?? 0) + 1,
            ...stats,
          };

          return { state: updatedState, schedule: SCHEDULE };
        } catch (e) {
          logger.warn(`Error executing ${TASK_ID} task, received ${e.message}`);

          // Retain the previously collected stats so a transient failure does not blank out
          // telemetry until the next successful run.
          const updatedState: LatestTaskStateSchema = {
            ...state,
            has_errors: true,
            error_messages: [e.message],
            runs: (state.runs ?? 0) + 1,
          };

          return { state: updatedState, schedule: SCHEDULE };
        }
      },
    };
  };
}
