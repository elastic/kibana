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
  Services,
  State,
} from '../types';
import { promiseResult, map } from './result_type';

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

      async executeAlertInstances(
        services: Services,
        { params, throttle, muteAll, mutedInstanceIds }: SavedObject['attributes'],
        executionHandler: ReturnType<typeof createExecutionHandler>
      ): Promise<State> {
        const {
          params: { alertId },
          state: { alertInstances: alertRawInstances = {}, alertTypeState = {} },
        } = taskInstance;

        const alertInstances = mapValues<AlertInstances>(
          alertRawInstances,
          alert => new AlertInstance(alert)
        );

        const updatedAlertTypeState = await alertType.executor({
          alertId,
          services: {
            ...services,
            alertInstanceFactory: createAlertInstanceFactory(alertInstances),
          },
          params,
          state: alertTypeState,
          startedAt: taskInstance.startedAt!,
          previousStartedAt: taskInstance.state.previousStartedAt,
        });

        // Cleanup alert instances that are no longer scheduling actions to avoid over populating the alertInstances object
        const instancesWithScheduledActions = pick<AlertInstances, AlertInstances>(
          alertInstances,
          alertInstance => alertInstance.hasScheduledActions()
        );

        if (!muteAll) {
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

        return {
          alertTypeState: updatedAlertTypeState,
          alertInstances: instancesWithScheduledActions,
        };
      },

      async run() {
        const {
          params: { alertId, spaceId },
          startedAt: previousStartedAt,
        } = taskInstance;

        const apiKey = await this.getApiKeyForAlertPermissions(alertId, spaceId);
        const services = await this.getServicesWithSpaceLevelPermissions(spaceId, apiKey);

        // Ensure API key is still valid and user has access
        const { attributes, references } = await services.savedObjectsClient.get<RawAlert>(
          'alert',
          alertId
        );

        // Validate
        const params = validateAlertTypeParams(alertType, attributes.params);
        const executionHandler = this.getExecutionHandler(
          alertId,
          spaceId,
          apiKey,
          attributes.actions,
          references
        );

        return {
          state: map<State, Error, State>(
            await promiseResult<State, Error>(
              this.executeAlertInstances(services, { ...attributes, params }, executionHandler)
            ),
            (stateUpdates: State) => {
              return {
                ...stateUpdates,
                previousStartedAt,
              };
            },
            (err: Error) => {
              logger.error(`Executing Alert "${alertId}" has resulted in Error: ${err.message}.`);
              return {
                ...taskInstance.state,
                previousStartedAt,
              };
            }
          ),
          runAt: getNextRunAt(
            new Date(taskInstance.startedAt!),
            // we do not currently have a good way of returning the type
            // from SavedObjectsClient, and as we currenrtly require a schedule
            // and we only support `interval`, we can cast this safely
            attributes.schedule as IntervalSchedule
          ),
        };
      },
    };
  }
}
