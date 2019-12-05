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

interface ConstructorOptions {
  taskManager: TaskManagerSetupContract;
  taskRunnerFactory: TaskRunnerFactory;
}

export class ActionTypeRegistry {
  private readonly taskManager: TaskManagerSetupContract;
  private readonly actionTypes: Map<string, ActionType> = new Map();
  private readonly taskRunnerFactory: TaskRunnerFactory;

  constructor({ taskManager, taskRunnerFactory }: ConstructorOptions) {
    this.taskManager = taskManager;
    this.taskRunnerFactory = taskRunnerFactory;
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
   * Returns a list of registered action types [{ id, name }]
   */
  public list() {
    return Array.from(this.actionTypes).map(([actionTypeId, actionType]) => ({
      id: actionTypeId,
      name: actionType.name,
    }));
  }
}
