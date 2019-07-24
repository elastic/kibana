/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { ActionsPlugin } from '../../../actions';
import { AlertType, Services, AlertServices } from '../types';
import { TaskInstance } from '../../../task_manager';
import { createFireHandler } from './create_fire_handler';
import { createAlertInstanceFactory } from './create_alert_instance_factory';
import { AlertInstance } from './alert_instance';
import { getNextRunAt } from './get_next_run_at';
import { validateAlertTypeParams } from './validate_alert_type_params';

interface CreateTaskRunnerFunctionOptions {
  getServices: (basePath: string) => Services;
  alertType: AlertType;
  fireAction: ActionsPlugin['fire'];
  internalSavedObjectsRepository: SavedObjectsClientContract;
}

interface TaskRunnerOptions {
  taskInstance: TaskInstance;
}

export function getCreateTaskRunnerFunction({
  getServices,
  alertType,
  fireAction,
  internalSavedObjectsRepository,
}: CreateTaskRunnerFunctionOptions) {
  return ({ taskInstance }: TaskRunnerOptions) => {
    return {
      run: async () => {
        const alertSavedObject = await internalSavedObjectsRepository.get(
          'alert',
          taskInstance.params.alertId
        );

        // Validate
        const validatedAlertTypeParams = validateAlertTypeParams(
          alertType,
          alertSavedObject.attributes.alertTypeParams
        );

        const fireHandler = createFireHandler({
          alertSavedObject,
          fireAction,
          basePath: taskInstance.params.basePath,
        });
        const alertInstances: Record<string, AlertInstance> = {};
        const alertInstancesData = taskInstance.state.alertInstances || {};
        for (const id of Object.keys(alertInstancesData)) {
          alertInstances[id] = new AlertInstance(alertInstancesData[id]);
        }
        const alertInstanceFactory = createAlertInstanceFactory(alertInstances);

        const alertTypeServices: AlertServices = {
          ...getServices(taskInstance.params.basePath),
          alertInstanceFactory,
        };

        const alertTypeState = await alertType.executor({
          services: alertTypeServices,
          params: validatedAlertTypeParams,
          state: taskInstance.state.alertTypeState || {},
          scheduledRunAt: taskInstance.state.scheduledRunAt,
          previousScheduledRunAt: taskInstance.state.previousScheduledRunAt,
        });

        await Promise.all(
          Object.keys(alertInstances).map(alertInstanceId => {
            const alertInstance = alertInstances[alertInstanceId];

            // Unpersist any alert instances that were not explicitly fired in this alert execution
            if (!alertInstance.shouldFire()) {
              delete alertInstances[alertInstanceId];
              return;
            }

            const { actionGroup, context, state } = alertInstance.getFireOptions()!;
            alertInstance.replaceMeta({ lastFired: Date.now() });
            alertInstance.resetFire();
            return fireHandler(actionGroup, context, state);
          })
        );

        const nextRunAt = getNextRunAt(
          new Date(taskInstance.state.scheduledRunAt),
          alertSavedObject.attributes.interval
        );

        return {
          state: {
            alertTypeState,
            alertInstances,
            // We store nextRunAt ourselves since task manager changes runAt when executing a task
            scheduledRunAt: nextRunAt,
            previousScheduledRunAt: taskInstance.state.scheduledRunAt,
          },
          runAt: nextRunAt,
        };
      },
    };
  };
}
