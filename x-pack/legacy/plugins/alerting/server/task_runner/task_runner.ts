/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick, mapValues, omit } from 'lodash';
import { Logger } from '../../../../../../src/core/server';
import { SavedObject } from '../../../../../../src/core/server';
import { TaskRunnerContext } from './task_runner_factory';
import { ConcreteTaskInstance } from '../../../task_manager';
import { createExecutionHandler } from './create_execution_handler';
import { AlertInstance, createAlertInstanceFactory } from '../alert_instance';
import { getNextRunAt } from './get_next_run_at';
import { validateAlertTypeParams } from '../lib';
import { AlertType, RawAlert, IntervalSchedule, Services, State } from '../types';
import { promiseResult, map } from '../lib/result_type';

type AlertInstances = Record<string, AlertInstance>;

export class TaskRunner {
  private context: TaskRunnerContext;
  private logger: Logger;
  private taskInstance: ConcreteTaskInstance;
  private alertType: AlertType;

  constructor(
    alertType: AlertType,
    taskInstance: ConcreteTaskInstance,
    context: TaskRunnerContext
  ) {
    this.context = context;
    this.logger = context.logger;
    this.alertType = alertType;
    this.taskInstance = taskInstance;
  }

  async getApiKeyForAlertPermissions(alertId: string, spaceId: string) {
    const namespace = this.context.spaceIdToNamespace(spaceId);
    // Only fetch encrypted attributes here, we'll create a saved objects client
    // scoped with the API key to fetch the remaining data.
    const {
      attributes: { apiKey },
    } = await this.context.encryptedSavedObjectsPlugin.getDecryptedAsInternalUser<RawAlert>(
      'alert',
      alertId,
      { namespace }
    );

    return apiKey;
  }

  async getServicesWithSpaceLevelPermissions(spaceId: string, apiKey: string | null) {
    const requestHeaders: Record<string, string> = {};

    if (apiKey) {
      requestHeaders.authorization = `ApiKey ${apiKey}`;
    }

    const fakeRequest = {
      headers: requestHeaders,
      getBasePath: () => this.context.getBasePath(spaceId),
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

    return this.context.getServices(fakeRequest);
  }

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
        throw new Error(`Action reference "${action.actionRef}" not found in alert id: ${alertId}`);
      }
      return {
        ...action,
        id: actionReference.id,
      };
    });

    return createExecutionHandler({
      alertId,
      logger: this.logger,
      executeAction: this.context.executeAction,
      apiKey,
      actions: actionsWithIds,
      spaceId,
      alertType: this.alertType,
    });
  }

  async executeAlertInstance(
    alertInstanceId: string,
    alertInstance: AlertInstance,
    executionHandler: ReturnType<typeof createExecutionHandler>
  ) {
    const { actionGroup, context, state } = alertInstance.getScheduledActionOptions()!;
    alertInstance.updateLastScheduledActions(actionGroup);
    alertInstance.unscheduleActions();
    return executionHandler({ actionGroup, context, state, alertInstanceId });
  }

  async executeAlertInstances(
    services: Services,
    {
      params,
      throttle,
      muteAll,
      mutedInstanceIds,
      name,
      tags,
      createdBy,
      updatedBy,
    }: SavedObject['attributes'],
    executionHandler: ReturnType<typeof createExecutionHandler>,
    spaceId: string
  ): Promise<State> {
    const {
      params: { alertId },
      state: { alertInstances: alertRawInstances = {}, alertTypeState = {}, previousStartedAt },
    } = this.taskInstance;
    const namespace = this.context.spaceIdToNamespace(spaceId);

    const alertInstances = mapValues<AlertInstances>(
      alertRawInstances,
      alert => new AlertInstance(alert)
    );

    const updatedAlertTypeState = await this.alertType.executor({
      alertId,
      services: {
        ...services,
        alertInstanceFactory: createAlertInstanceFactory(alertInstances),
      },
      params,
      state: alertTypeState,
      startedAt: this.taskInstance.startedAt!,
      previousStartedAt,
      spaceId,
      namespace,
      name,
      tags,
      createdBy,
      updatedBy,
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
  }

  async validateAndRunAlert(
    services: Services,
    apiKey: string | null,
    attributes: SavedObject['attributes'],
    references: SavedObject['references']
  ) {
    const {
      params: { alertId, spaceId },
    } = this.taskInstance;

    // Validate
    const params = validateAlertTypeParams(this.alertType, attributes.params);
    const executionHandler = this.getExecutionHandler(
      alertId,
      spaceId,
      apiKey,
      attributes.actions,
      references
    );
    return this.executeAlertInstances(
      services,
      { ...attributes, params },
      executionHandler,
      spaceId
    );
  }

  async run() {
    const {
      params: { alertId, spaceId },
      startedAt: previousStartedAt,
      state: originalState,
    } = this.taskInstance;

    const apiKey = await this.getApiKeyForAlertPermissions(alertId, spaceId);
    const services = await this.getServicesWithSpaceLevelPermissions(spaceId, apiKey);

    // Ensure API key is still valid and user has access
    const { attributes, references } = await services.savedObjectsClient.get<RawAlert>(
      'alert',
      alertId
    );

    return {
      state: map<State, Error, State>(
        await promiseResult<State, Error>(
          this.validateAndRunAlert(services, apiKey, attributes, references)
        ),
        (stateUpdates: State) => {
          return {
            ...stateUpdates,
            previousStartedAt,
          };
        },
        (err: Error) => {
          this.logger.error(`Executing Alert "${alertId}" has resulted in Error: ${err.message}`);
          return {
            ...originalState,
            previousStartedAt,
          };
        }
      ),
      runAt: getNextRunAt(
        new Date(this.taskInstance.startedAt!),
        // we do not currently have a good way of returning the type
        // from SavedObjectsClient, and as we currenrtly require a schedule
        // and we only support `interval`, we can cast this safely
        attributes.schedule as IntervalSchedule
      ),
    };
  }
}
