/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { ActionsPlugin } from '../../../actions';
import { AlertType, AlertServices, RawAlert, GetServicesFunction } from '../types';
import { ConcreteTaskInstance } from '../../../task_manager';
import { createFireHandler } from './create_fire_handler';
import { createAlertInstanceFactory } from './create_alert_instance_factory';
import { AlertInstance } from './alert_instance';
import { getNextRunAt } from './get_next_run_at';
import { validateAlertTypeParams } from './validate_alert_type_params';
import { SpacesPlugin } from '../../../spaces';

interface CreateTaskRunnerFunctionOptions {
  getServices: GetServicesFunction;
  alertType: AlertType;
  fireAction: ActionsPlugin['fire'];
  savedObjectsRepositoryWithInternalUser: SavedObjectsClientContract;
  spaceIdToNamespace: SpacesPlugin['spaceIdToNamespace'];
  getBasePath: SpacesPlugin['getBasePath'];
}

interface TaskRunnerOptions {
  taskInstance: ConcreteTaskInstance;
}

export function getCreateTaskRunnerFunction({
  getServices,
  alertType,
  fireAction,
  savedObjectsRepositoryWithInternalUser,
  spaceIdToNamespace,
  getBasePath,
}: CreateTaskRunnerFunctionOptions) {
  return ({ taskInstance }: TaskRunnerOptions) => {
    return {
      run: async () => {
        const namespace = spaceIdToNamespace(taskInstance.params.spaceId);
        // Only get attributes that are needed, we shouldn't pass around this saved object
        // due to containing encrypted attributes which are returned from repository.
        const {
          attributes: { alertTypeParams, actions, interval },
          references,
        } = await savedObjectsRepositoryWithInternalUser.get<RawAlert>(
          'alert',
          taskInstance.params.alertId,
          { namespace }
        );

        const fakeRequest = {
          headers: {} as any,
          getBasePath: () => getBasePath(taskInstance.params.spaceId),
        };

        const services = getServices(fakeRequest);

        // Validate
        const validatedAlertTypeParams = validateAlertTypeParams(alertType, alertTypeParams);

        // Inject ids into actions
        const actionsWithIds = actions.map(action => {
          const actionReference = references.find(obj => obj.name === action.actionRef);
          if (!actionReference) {
            throw new Error(
              `Action reference "${action.actionRef}" not found in alert id: ${taskInstance.params.alertId}`
            );
          }
          return {
            ...action,
            id: actionReference.id,
          };
        });

        const fireHandler = createFireHandler({
          fireAction,
          actions: actionsWithIds,
          spaceId: taskInstance.params.spaceId,
        });
        const alertInstances: Record<string, AlertInstance> = {};
        const alertInstancesData = taskInstance.state.alertInstances || {};
        for (const id of Object.keys(alertInstancesData)) {
          alertInstances[id] = new AlertInstance(alertInstancesData[id]);
        }
        const alertInstanceFactory = createAlertInstanceFactory(alertInstances);

        const alertTypeServices: AlertServices = {
          ...services,
          alertInstanceFactory,
        };

        const alertTypeState = await alertType.executor({
          services: alertTypeServices,
          params: validatedAlertTypeParams,
          state: taskInstance.state.alertTypeState || {},
          startedAt: taskInstance.startedAt!,
          previousStartedAt: taskInstance.state.previousStartedAt,
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

        const nextRunAt = getNextRunAt(new Date(taskInstance.startedAt!), interval);

        return {
          state: {
            alertTypeState,
            alertInstances,
            previousStartedAt: taskInstance.startedAt!,
          },
          runAt: nextRunAt,
        };
      },
    };
  };
}
