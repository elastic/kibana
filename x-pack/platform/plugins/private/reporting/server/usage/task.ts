/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, CoreSetup } from '@kbn/core/server';
import type {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  IntervalSchedule,
} from '@kbn/task-manager-plugin/server';
import { getTotalCountAggregations } from './lib/get_telemetry_from_kibana';
import { stateSchemaByVersion, emptyState, type LatestTaskStateSchema } from './task_state';
import { SCHEDULED_REPORT_SAVED_OBJECT_TYPE } from '../saved_objects';

export const TELEMETRY_TASK_TYPE = 'reporting_telemetry';

export const TASK_ID = `Reporting-${TELEMETRY_TASK_TYPE}`;
export const SCHEDULE: IntervalSchedule = { interval: '1d' };

export function initializeReportingTelemetryTask(
  logger: Logger,
  core: CoreSetup,
  taskManager: TaskManagerSetupContract
) {
  registerReportingTelemetryTask(logger, core, taskManager);
}

function registerReportingTelemetryTask(
  logger: Logger,
  core: CoreSetup,
  taskManager: TaskManagerSetupContract
) {
  taskManager.registerTaskDefinitions({
    [TELEMETRY_TASK_TYPE]: {
      title: 'Reporting snapshot telemetry fetch task',
      timeout: '5m',
      stateSchemaByVersion,
      createTaskRunner: telemetryTaskRunner(logger, core),
    },
  });
}

export function scheduleReportingTelemetry(logger: Logger, taskManager?: TaskManagerStartContract) {
  if (taskManager) {
    taskManager
      .ensureScheduled({
        id: TASK_ID,
        taskType: TELEMETRY_TASK_TYPE,
        state: emptyState,
        params: {},
        schedule: SCHEDULE,
      })
      .catch((e) =>
        logger.error(`Error scheduling ${TASK_ID}, received ${e.message}`, {
          error: { stack_trace: e.stack },
        })
      );
  }
}

export function telemetryTaskRunner(logger: Logger, core: CoreSetup) {
  return ({ taskInstance }: RunContext) => {
    const state = taskInstance.state as LatestTaskStateSchema;
    const getServices = () =>
      core.getStartServices().then(([coreStart]) => {
        return {
          savedObjectIndex: coreStart.savedObjects.getIndexForType(
            SCHEDULED_REPORT_SAVED_OBJECT_TYPE
          ),
          esClient: coreStart.elasticsearch.client.asInternalUser,
        };
      });

    return {
      async run() {
        const { esClient, savedObjectIndex } = await getServices();

        return getTotalCountAggregations({ esClient, index: savedObjectIndex, logger })
          .then((totalCountAggregations) => {
            const hasErrors = totalCountAggregations.hasErrors;

            const errorMessages = [totalCountAggregations.errorMessage].filter(
              (message) => message !== undefined
            );

            const updatedState: LatestTaskStateSchema = {
              has_errors: hasErrors,
              ...(totalCountAggregations.errorMessage && { error_messages: [errorMessages] }),
              runs: (state.runs || 0) + 1,
              number_of_scheduled_reports: totalCountAggregations.number_of_scheduled_reports,
              number_of_enabled_scheduled_reports:
                totalCountAggregations.number_of_enabled_scheduled_reports,
              number_of_scheduled_reports_by_type:
                totalCountAggregations.number_of_scheduled_reports_by_type,
              number_of_enabled_scheduled_reports_by_type:
                totalCountAggregations.number_of_enabled_scheduled_reports_by_type,
              number_of_scheduled_reports_with_notifications:
                totalCountAggregations.number_of_scheduled_reports_with_notifications,
            };

            return {
              state: updatedState,
              // Useful for setting a schedule for the old tasks that don't have one
              // or to update the schedule if ever the frequency changes in code
              schedule: SCHEDULE,
            };
          })
          .catch((errMsg) => {
            logger.warn(`Error executing reporting telemetry task: ${errMsg}`);
            return {
              state: emptyState,
              // Useful for setting a schedule for the old tasks that don't have one
              // or to update the schedule if ever the frequency changes in code
              schedule: SCHEDULE,
            };
          });
      },
    };
  };
}
