/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from '../../../../../../src/core/server';
import { RunContext } from '../../../../../plugins/task_manager/server';
import { PluginStartContract as EncryptedSavedObjectsStartContract } from '../../../../../plugins/encrypted_saved_objects/server';
import { PluginStartContract as ActionsPluginStartContract } from '../../../actions';
import {
  AlertType,
  GetBasePathFunction,
  GetServicesFunction,
  SpaceIdToNamespaceFunction,
} from '../types';
import { TaskRunner } from './task_runner';

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

    return new TaskRunner(alertType, taskInstance, this.taskRunnerContext!);
  }
}
