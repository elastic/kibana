/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { i18n } from '@kbn/i18n';
import { SavedObjectsClientContract } from 'src/core/server';
import { AlertType, Services } from './types';
import { TaskManager } from '../../task_manager';
import { getCreateTaskRunnerFunction } from './lib';
import { ActionsPlugin } from '../../actions';

interface ConstructorOptions {
  getServices: (basePath: string) => Services;
  taskManager: TaskManager;
  fireAction: ActionsPlugin['fire'];
  internalSavedObjectsRepository: SavedObjectsClientContract;
}

export class AlertTypeRegistry {
  private readonly getServices: (basePath: string) => Services;
  private readonly taskManager: TaskManager;
  private readonly fireAction: ActionsPlugin['fire'];
  private readonly alertTypes: Map<string, AlertType> = new Map();
  private readonly internalSavedObjectsRepository: SavedObjectsClientContract;

  constructor({
    internalSavedObjectsRepository,
    fireAction,
    taskManager,
    getServices,
  }: ConstructorOptions) {
    this.taskManager = taskManager;
    this.fireAction = fireAction;
    this.internalSavedObjectsRepository = internalSavedObjectsRepository;
    this.getServices = getServices;
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
          getServices: this.getServices,
          fireAction: this.fireAction,
          internalSavedObjectsRepository: this.internalSavedObjectsRepository,
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
