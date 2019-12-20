/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { pick, mapValues, omit } from 'lodash';
import { Logger, SavedObject } from '../../../../../../src/core/server';
import { RunContext } from '../../../task_manager';
import { createExecutionHandler } from './create_execution_handler';
import { createAlertInstanceFactory } from './create_alert_instance_factory';
import { AlertInstance } from './alert_instance';
import { getNextRunAt } from './get_next_run_at';
import { validateAlertTypeParams } from './validate_alert_type_params';
import { PluginStartContract as EncryptedSavedObjectsStartContract } from '../../../../../plugins/encrypted_saved_objects/server';
import { PluginStartContract as ActionsPluginStartContract } from '../../../actions';
import {
  AlertType,
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

type AlertInstances = Record<string, AlertInstance>;

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
      async getApiKeyForAlertPermissions(alertId: string, spaceId: string) {
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

        return apiKey;
      },

      async getServicesWithSpaceLevelPermissions(spaceId: string, apiKey: string | null) {
        const requestHeaders: Record<string, string> = {};

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

        return getServices(fakeRequest);
      },

      getExecutionHandler(
        alertId: string,
        spaceId: string,
        apiKey: string | null,
        actions: RawAlert['actions'],
        references: SavedObject['references']
      ) {
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

        return createExecutionHandler({
          alertId,
          logger,
          executeAction,
          apiKey,
          actions: actionsWithIds,
          spaceId,
          alertType,
        });
      },

      async executeAlertInstance(
        alertInstanceId: string,
        alertInstance: AlertInstance,
        executionHandler: ReturnType<typeof createExecutionHandler>
      ) {
        const { actionGroup, context, state } = alertInstance.getScheduledActionOptions()!;
        alertInstance.updateLastScheduledActions(actionGroup);
        alertInstance.unscheduleActions();
        return executionHandler({ actionGroup, context, state, alertInstanceId });
      },

      async run() {
        const {
          params: { alertId, spaceId },
          state: { alertInstances: alertRawInstances = {} },
        } = taskInstance;
        const apiKey = await this.getApiKeyForAlertPermissions(alertId, spaceId);
        const services = await this.getServicesWithSpaceLevelPermissions(spaceId, apiKey);

        // Ensure API key is still valid and user has access
        const {
          attributes: { params, actions, schedule, throttle, muteAll, mutedInstanceIds },
          references,
        } = await services.savedObjectsClient.get<RawAlert>('alert', alertId);

        // Validate
        const validatedAlertTypeParams = validateAlertTypeParams(alertType, params);

        const alertInstances = mapValues(alertRawInstances, alert => new AlertInstance(alert));

        const alertTypeState = await alertType.executor({
          alertId,
          services: {
            ...services,
            alertInstanceFactory: createAlertInstanceFactory(alertInstances),
          },
          params: validatedAlertTypeParams,
          state: taskInstance.state.alertTypeState || {},
          startedAt: taskInstance.startedAt!,
          previousStartedAt: taskInstance.state.previousStartedAt,
        });

        const instancesWithScheduledActions = pick<AlertInstances, AlertInstances>(
          alertInstances,
          alertInstance => alertInstance.hasScheduledActions()
        );

        if (!muteAll) {
          const executionHandler = this.getExecutionHandler(
            alertId,
            spaceId,
            apiKey,
            actions,
            references
          );
          const enabledAlertInstances = omit<AlertInstances, AlertInstances>(
            instancesWithScheduledActions,
            ...mutedInstanceIds
          );

          await Promise.all(
            Object.entries(enabledAlertInstances)
              .filter(
                ([, alertInstance]: [string, AlertInstance]) => !alertInstance.isThrottled(throttle)
              )
              .map(([id, alertInstance]: [string, AlertInstance]) =>
                this.executeAlertInstance(id, alertInstance, executionHandler)
              )
          );
        }

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
            // Cleanup alert instances that are no longer scheduling actions to avoid over populating the alertInstances object
            alertInstances: instancesWithScheduledActions,
            previousStartedAt: taskInstance.startedAt!,
          },
          runAt: nextRunAt,
        };
      },
    };
  }
}
