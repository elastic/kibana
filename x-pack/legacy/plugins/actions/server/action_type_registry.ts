/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';
import { ActionType, GetServicesFunction } from './types';
import { TaskManager, TaskRunCreatorFunction } from '../../task_manager';
import { getCreateTaskRunnerFunction } from './lib';
import { EncryptedSavedObjectsPlugin } from '../../encrypted_saved_objects';

interface ConstructorOptions {
  taskManager: TaskManager;
  getServices: GetServicesFunction;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;
}

export class ActionTypeRegistry {
  private readonly taskRunCreatorFunction: TaskRunCreatorFunction;
  private readonly getServices: GetServicesFunction;
  private readonly taskManager: TaskManager;
  private readonly actionTypes: Map<string, ActionType> = new Map();
  private readonly encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;

  constructor({ getServices, taskManager, encryptedSavedObjectsPlugin }: ConstructorOptions) {
    this.getServices = getServices;
    this.taskManager = taskManager;
    this.encryptedSavedObjectsPlugin = encryptedSavedObjectsPlugin;
    this.taskRunCreatorFunction = getCreateTaskRunnerFunction({
      actionTypeRegistry: this,
      getServices: this.getServices,
      encryptedSavedObjectsPlugin: this.encryptedSavedObjectsPlugin,
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
  public register(actionType: ActionType) {
    if (this.has(actionType.id)) {
      throw new Error(
        i18n.translate('xpack.actions.actionTypeRegistry.register.duplicateActionTypeError', {
          defaultMessage: 'Action type "{id}" is already registered.',
          values: {
            id: actionType.id,
          },
        })
      );
    }
    this.actionTypes.set(actionType.id, actionType);
    this.taskManager.registerTaskDefinitions({
      [`actions:${actionType.id}`]: {
        title: actionType.name,
        type: `actions:${actionType.id}`,
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
        i18n.translate('xpack.actions.actionTypeRegistry.get.missingActionTypeError', {
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
