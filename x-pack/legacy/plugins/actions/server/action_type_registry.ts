/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';
import { Option, none } from 'fp-ts/lib/Option';
import { TaskManager, TaskRunCreatorFunction } from '../../task_manager';
import { getCreateTaskRunnerFunction, ExecutorError } from './lib';
import { EncryptedSavedObjectsPlugin } from '../../encrypted_saved_objects';
import {
  ActionType,
  ConfigureableActionType,
  GetBasePathFunction,
  GetServicesFunction,
  SpaceIdToNamespaceFunction,
} from './types';
import { ActionsConfigType } from './actions_config';

interface ConstructorOptions {
  isSecurityEnabled: boolean;
  taskManager: TaskManager;
  getServices: GetServicesFunction;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  getBasePath: GetBasePathFunction;
  actionKibanaConfigurations: Option<ActionsConfigType>;
}

function getKibanaConfigurationByActionType(
  actionType: string,
  configs: Option<Record<string, any>>
): Option<any> {
  return configs.mapNullable(allConfigs => allConfigs[actionType]);
}

function isConfigurable(
  actionType: ActionType | ConfigureableActionType<any>
): actionType is ConfigureableActionType<any> {
  return (
    actionType.hasOwnProperty('configure') &&
    typeof (actionType as ConfigureableActionType<any>).configure === 'function'
  );
}

export class ActionTypeRegistry {
  private readonly taskRunCreatorFunction: TaskRunCreatorFunction;
  private readonly taskManager: TaskManager;
  private readonly actionTypes: Map<string, ActionType> = new Map();
  private readonly actionKibanaConfigurations: Option<ActionsConfigType> = none;

  constructor({
    getServices,
    taskManager,
    encryptedSavedObjectsPlugin,
    spaceIdToNamespace,
    getBasePath,
    actionKibanaConfigurations,
    isSecurityEnabled,
  }: ConstructorOptions) {
    this.taskManager = taskManager;
    this.actionKibanaConfigurations = actionKibanaConfigurations;
    this.taskRunCreatorFunction = getCreateTaskRunnerFunction({
      isSecurityEnabled,
      getServices,
      actionTypeRegistry: this,
      encryptedSavedObjectsPlugin,
      spaceIdToNamespace,
      getBasePath,
    });
  }

  /**
   * Returns if the action type registry has the given action type registered
   */
  public has(id: string) {
    return this.actionTypes.has(id);
  }

  /**
   * Registers an action type to the action type registry
   */
  public register(providedActionType: ActionType | ConfigureableActionType<any>) {
    const actionType = isConfigurable(providedActionType)
      ? providedActionType.configure(
          getKibanaConfigurationByActionType(
            providedActionType.name,
            this.actionKibanaConfigurations
          )
        )
      : providedActionType;

    if (this.has(actionType.id)) {
      throw new Error(
        i18n.translate(
          'xpack.actions.actionTypeRegistry.register.duplicateActionTypeErrorMessage',
          {
            defaultMessage: 'Action type "{id}" is already registered.',
            values: {
              id: actionType.id,
            },
          }
        )
      );
    }

    this.actionTypes.set(actionType.id, actionType);
    this.taskManager.registerTaskDefinitions({
      [`actions:${actionType.id}`]: {
        title: actionType.name,
        type: `actions:${actionType.id}`,
        maxAttempts: actionType.maxAttempts || 1,
        getRetry(attempts: number, error: any) {
          if (error instanceof ExecutorError) {
            return error.retry == null ? false : error.retry;
          }
          // Don't retry other kinds of errors
          return false;
        },
        createTaskRunner: this.taskRunCreatorFunction,
      },
    });
  }

  /**
   * Returns an action type, throws if not registered
   */
  public get(id: string): ActionType {
    if (!this.has(id)) {
      throw Boom.badRequest(
        i18n.translate('xpack.actions.actionTypeRegistry.get.missingActionTypeErrorMessage', {
          defaultMessage: 'Action type "{id}" is not registered.',
          values: {
            id,
          },
        })
      );
    }
    return this.actionTypes.get(id)!;
  }

  /**
   * Returns a list of registered action types [{ id, name }]
   */
  public list() {
    return Array.from(this.actionTypes).map(([actionTypeId, actionType]) => ({
      id: actionTypeId,
      name: actionType.name,
    }));
  }
}
