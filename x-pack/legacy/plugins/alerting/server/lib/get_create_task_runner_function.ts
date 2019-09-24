/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ActionsPlugin } from '../../../actions';
import { ConcreteTaskInstance } from '../../../task_manager';
import { createExecutionHandler } from './create_execution_handler';
import { createAlertInstanceFactory } from './create_alert_instance_factory';
import { AlertInstance } from './alert_instance';
import { getNextRunAt } from './get_next_run_at';
import { validateAlertTypeParams } from './validate_alert_type_params';
import { EncryptedSavedObjectsPlugin } from '../../../encrypted_saved_objects';
import {
  AlertType,
  AlertServices,
  GetBasePathFunction,
  GetServicesFunction,
  RawAlert,
  SpaceIdToNamespaceFunction,
} from '../types';

export interface CreateTaskRunnerFunctionOptions {
  isSecurityEnabled: boolean;
  getServices: GetServicesFunction;
  alertType: AlertType;
  executeAction: ActionsPlugin['execute'];
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  getBasePath: GetBasePathFunction;
}

interface TaskRunnerOptions {
  taskInstance: ConcreteTaskInstance;
}

export function getCreateTaskRunnerFunction({
  getServices,
  alertType,
  executeAction,
  encryptedSavedObjectsPlugin,
  spaceIdToNamespace,
  getBasePath,
  isSecurityEnabled,
}: CreateTaskRunnerFunctionOptions) {
  return ({ taskInstance }: TaskRunnerOptions) => {
    return {
      run: async () => {
        const { alertId, spaceId } = taskInstance.params;
        const requestHeaders: Record<string, string> = {};
        const namespace = spaceIdToNamespace(spaceId);
        // Only fetch encrypted attributes here, we'll create a saved objects client
        // scoped with the API key to fetch the remaining data.
        const {
          attributes: { apiKey },
        } = await encryptedSavedObjectsPlugin.getDecryptedAsInternalUser<RawAlert>(
          'alert',
          alertId,
          { namespace }
        );

        if (isSecurityEnabled && !apiKey) {
          throw new Error('API key is required. The attribute "apiKey" is missing.');
        } else if (isSecurityEnabled) {
          requestHeaders.authorization = `ApiKey ${apiKey}`;
        }

        const fakeRequest = {
          headers: requestHeaders,
          getBasePath: () => getBasePath(spaceId),
        };

        const services = getServices(fakeRequest);
        // Ensure API key is still valid and user has access
        const {
          attributes: { alertTypeParams, actions, interval, throttle, muted, mutedInstanceIds },
          references,
        } = await services.savedObjectsClient.get<RawAlert>('alert', alertId);

        // Validate
        const validatedAlertTypeParams = validateAlertTypeParams(alertType, alertTypeParams);

        // Inject ids into actions
        const actionsWithIds = actions.map(action => {
          const actionReference = references.find(obj => obj.name === action.actionRef);
          if (!actionReference) {
            throw new Error(
              `Action reference "${action.actionRef}" not found in alert id: ${alertId}`
            );
          }
          return {
            ...action,
            id: actionReference.id,
          };
        });

        const executionHandler = createExecutionHandler({
          alertId,
          log: services.log,
          executeAction,
          apiKey,
          actions: actionsWithIds,
          spaceId,
          alertType,
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
            if (alertInstance.hasScheduledActions(throttle)) {
              if (muted || mutedInstanceIds.includes(alertInstanceId)) {
                return;
              }
              const { actionGroup, context, state } = alertInstance.getSechduledActionOptions()!;
              alertInstance.updateLastScheduledActions(actionGroup);
              alertInstance.unscheduleActions();
              return executionHandler({ actionGroup, context, state, alertInstanceId });
            } else {
              // Cleanup alert instances that are no longer scheduling actions to avoid over populating the alertInstances object
              delete alertInstances[alertInstanceId];
            }
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
