/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../../../../../src/core/server';
import { RunContext } from '../../../task_manager/server';
import { createExecutionHandler } from './create_execution_handler';
import { createAlertInstanceFactory } from './create_alert_instance_factory';
import { AlertInstance } from './alert_instance';
import { getNextRunAt } from './get_next_run_at';
import { validateAlertTypeParams } from './validate_alert_type_params';
import { PluginStartContract as EncryptedSavedObjectsStartContract } from '../../../../../plugins/encrypted_saved_objects/server';
import { PluginStartContract as ActionsPluginStartContract } from '../../../actions';
import {
  AlertType,
  AlertServices,
  GetBasePathFunction,
  GetServicesFunction,
  RawAlert,
  SpaceIdToNamespaceFunction,
  IntervalSchedule,
} from '../types';

export interface TaskRunnerContext {
  logger: Logger;
  getServices: GetServicesFunction;
  executeAction: ActionsPluginStartContract['execute'];
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsStartContract;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  getBasePath: GetBasePathFunction;
}

export class TaskRunnerFactory {
  private isInitialized = false;
  private taskRunnerContext?: TaskRunnerContext;

  public initialize(taskRunnerContext: TaskRunnerContext) {
    if (this.isInitialized) {
      throw new Error('TaskRunnerFactory already initialized');
    }
    this.isInitialized = true;
    this.taskRunnerContext = taskRunnerContext;
  }

  public create(alertType: AlertType, { taskInstance }: RunContext) {
    if (!this.isInitialized) {
      throw new Error('TaskRunnerFactory not initialized');
    }

    const {
      logger,
      getServices,
      executeAction,
      encryptedSavedObjectsPlugin,
      spaceIdToNamespace,
      getBasePath,
    } = this.taskRunnerContext!;

    return {
      async run() {
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

        if (apiKey) {
          requestHeaders.authorization = `ApiKey ${apiKey}`;
        }

        const fakeRequest = {
          headers: requestHeaders,
          getBasePath: () => getBasePath(spaceId),
          path: '/',
          route: { settings: {} },
          url: {
            href: '/',
          },
          raw: {
            req: {
              url: '/',
            },
          },
        };

        const services = getServices(fakeRequest);
        // Ensure API key is still valid and user has access
        const {
          attributes: { params, actions, schedule, throttle, muteAll, mutedInstanceIds },
          references,
        } = await services.savedObjectsClient.get<RawAlert>('alert', alertId);

        // Validate
        const validatedAlertTypeParams = validateAlertTypeParams(alertType, params);

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
          logger,
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
          alertId,
          services: alertTypeServices,
          params: validatedAlertTypeParams,
          state: taskInstance.state.alertTypeState || {},
          startedAt: taskInstance.startedAt!,
          previousStartedAt: taskInstance.state.previousStartedAt,
        });

        await Promise.all(
          Object.keys(alertInstances).map(alertInstanceId => {
            const alertInstance = alertInstances[alertInstanceId];
            if (alertInstance.hasScheduledActions()) {
              if (
                alertInstance.isThrottled(throttle) ||
                muteAll ||
                mutedInstanceIds.includes(alertInstanceId)
              ) {
                return;
              }
              const { actionGroup, context, state } = alertInstance.getScheduledActionOptions()!;
              alertInstance.updateLastScheduledActions(actionGroup);
              alertInstance.unscheduleActions();
              return executionHandler({ actionGroup, context, state, alertInstanceId });
            } else {
              // Cleanup alert instances that are no longer scheduling actions to avoid over populating the alertInstances object
              delete alertInstances[alertInstanceId];
            }
          })
        );

        const nextRunAt = getNextRunAt(
          new Date(taskInstance.startedAt!),
          // we do not currently have a good way of returning the type
          // from SavedObjectsClient, and as we currenrtly require a schedule
          // and we only support `interval`, we can cast this safely
          schedule as IntervalSchedule
        );

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
  }
}
