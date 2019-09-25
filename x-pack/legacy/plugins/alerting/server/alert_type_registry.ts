/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { i18n } from '@kbn/i18n';
import { TaskManager } from '../../task_manager';
import { getCreateTaskRunnerFunction } from './lib';
import { ActionsPlugin } from '../../actions';
import { EncryptedSavedObjectsPlugin } from '../../encrypted_saved_objects';
import {
  AlertType,
  GetBasePathFunction,
  GetServicesFunction,
  SpaceIdToNamespaceFunction,
} from './types';

interface ConstructorOptions {
  isSecurityEnabled: boolean;
  getServices: GetServicesFunction;
  taskManager: TaskManager;
  executeAction: ActionsPlugin['execute'];
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;
  spaceIdToNamespace: SpaceIdToNamespaceFunction;
  getBasePath: GetBasePathFunction;
}

export class AlertTypeRegistry {
  private readonly getServices: GetServicesFunction;
  private readonly taskManager: TaskManager;
  private readonly executeAction: ActionsPlugin['execute'];
  private readonly alertTypes: Map<string, AlertType> = new Map();
  private readonly encryptedSavedObjectsPlugin: EncryptedSavedObjectsPlugin;
  private readonly spaceIdToNamespace: SpaceIdToNamespaceFunction;
  private readonly getBasePath: GetBasePathFunction;
  private readonly isSecurityEnabled: boolean;

  constructor({
    encryptedSavedObjectsPlugin,
    executeAction,
    taskManager,
    getServices,
    spaceIdToNamespace,
    getBasePath,
    isSecurityEnabled,
  }: ConstructorOptions) {
    this.taskManager = taskManager;
    this.executeAction = executeAction;
    this.encryptedSavedObjectsPlugin = encryptedSavedObjectsPlugin;
    this.getServices = getServices;
    this.getBasePath = getBasePath;
    this.spaceIdToNamespace = spaceIdToNamespace;
    this.isSecurityEnabled = isSecurityEnabled;
  }

  public has(id: string) {
    return this.alertTypes.has(id);
  }

  public register(alertType: AlertType) {
    if (this.has(alertType.id)) {
      throw new Error(
        i18n.translate('xpack.alerting.alertTypeRegistry.register.duplicateAlertTypeError', {
          defaultMessage: 'Alert type "{id}" is already registered.',
          values: {
            id: alertType.id,
          },
        })
      );
    }
    this.alertTypes.set(alertType.id, alertType);
    this.taskManager.registerTaskDefinitions({
      [`alerting:${alertType.id}`]: {
        title: alertType.name,
        type: `alerting:${alertType.id}`,
        createTaskRunner: getCreateTaskRunnerFunction({
          alertType,
          isSecurityEnabled: this.isSecurityEnabled,
          getServices: this.getServices,
          executeAction: this.executeAction,
          encryptedSavedObjectsPlugin: this.encryptedSavedObjectsPlugin,
          getBasePath: this.getBasePath,
          spaceIdToNamespace: this.spaceIdToNamespace,
        }),
      },
    });
  }

  public get(id: string): AlertType {
    if (!this.has(id)) {
      throw Boom.badRequest(
        i18n.translate('xpack.alerting.alertTypeRegistry.get.missingAlertTypeError', {
          defaultMessage: 'Alert type "{id}" is not registered.',
          values: {
            id,
          },
        })
      );
    }
    return this.alertTypes.get(id)!;
  }

  public list() {
    return Array.from(this.alertTypes).map(([alertTypeId, alertType]) => ({
      id: alertTypeId,
      name: alertType.name,
    }));
  }
}
