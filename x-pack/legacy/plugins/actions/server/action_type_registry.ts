/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';
import { TaskManagerSetupContract } from './shim';
import { RunContext } from '../../task_manager';
import { ExecutorError, TaskRunnerFactory } from './lib';
import { ActionType } from './types';
import { ActionsConfigurationUtilities } from './actions_config';
interface ConstructorOptions {
  taskManager: TaskManagerSetupContract;
  taskRunnerFactory: TaskRunnerFactory;
  actionsConfigUtils: ActionsConfigurationUtilities;
}

export class ActionTypeRegistry {
  private readonly taskManager: TaskManagerSetupContract;
  private readonly actionTypes: Map<string, ActionType> = new Map();
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private readonly actionsConfigUtils: ActionsConfigurationUtilities;

  constructor(constructorParams: ConstructorOptions) {
    this.taskManager = constructorParams.taskManager;
    this.taskRunnerFactory = constructorParams.taskRunnerFactory;
    this.actionsConfigUtils = constructorParams.actionsConfigUtils;
  }

  /**
   * Returns if the action type registry has the given action type registered
   */
  public has(id: string) {
    return this.actionTypes.has(id);
  }

  /**
   * Throws error if action type is not enabled.
   */
  public ensureActionTypeEnabled(id: string) {
    this.actionsConfigUtils.ensureActionTypeEnabled(id);
  }

  /**
   * Registers an action type to the action type registry
   */
  public register(actionType: ActionType) {
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
        createTaskRunner: (context: RunContext) => this.taskRunnerFactory.create(context),
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
   * Returns a list of registered action types [{ id, name, enabled }]
   */
  public list() {
    return Array.from(this.actionTypes).map(([actionTypeId, actionType]) => ({
      id: actionTypeId,
      name: actionType.name,
      enabled: this.actionsConfigUtils.isActionTypeEnabled(actionTypeId),
    }));
  }
}
