/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';
import { SavedObjectsClientContract, SavedObjectReference } from 'src/core/server';
import { Alert, RawAlert, AlertTypeRegistry, AlertAction, Log } from './types';
import { TaskManager } from '../../task_manager';
import { validateAlertTypeParams } from './lib';

interface ConstructorOptions {
  log: Log;
  taskManager: TaskManager;
  savedObjectsClient: SavedObjectsClientContract;
  alertTypeRegistry: AlertTypeRegistry;
  basePath: string;
}

interface FindOptions {
  options?: {
    perPage?: number;
    page?: number;
    search?: string;
    defaultSearchOperator?: 'AND' | 'OR';
    searchFields?: string[];
    sortField?: string;
    hasReference?: {
      type: string;
      id: string;
    };
    fields?: string[];
  };
}

interface CreateOptions {
  data: Alert;
  options?: {
    migrationVersion?: Record<string, string>;
  };
}

interface UpdateOptions {
  id: string;
  data: {
    interval: number;
    actions: AlertAction[];
    alertTypeParams: Record<string, any>;
  };
  options?: { version?: string };
}

export class AlertsClient {
  private readonly log: Log;
  private readonly basePath: string;
  private readonly taskManager: TaskManager;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly alertTypeRegistry: AlertTypeRegistry;

  constructor({
    alertTypeRegistry,
    savedObjectsClient,
    taskManager,
    log,
    basePath,
  }: ConstructorOptions) {
    this.log = log;
    this.basePath = basePath;
    this.taskManager = taskManager;
    this.alertTypeRegistry = alertTypeRegistry;
    this.savedObjectsClient = savedObjectsClient;
  }

  public async create({ data, options }: CreateOptions) {
    // Throws an error if alert type isn't registered
    const alertType = this.alertTypeRegistry.get(data.alertTypeId);
    const validatedAlertTypeParams = validateAlertTypeParams(alertType, data.alertTypeParams);
    const { alert: rawAlert, references } = this.getRawAlert({
      ...data,
      alertTypeParams: validatedAlertTypeParams,
    });
    const createdAlert = await this.savedObjectsClient.create('alert', rawAlert, {
      ...options,
      references,
    });
    let scheduledTask;
    try {
      scheduledTask = await this.scheduleAlert(createdAlert.id, rawAlert, this.basePath);
    } catch (e) {
      // Cleanup data, something went wrong scheduling the task
      try {
        await this.savedObjectsClient.delete('alert', createdAlert.id);
      } catch (err) {
        // Skip the cleanup error and throw the task manager error to avoid confusion
        this.log(
          ['alerting', 'error'],
          `Failed to cleanup alert "${createdAlert.id}" after scheduling task failed. Error: ${
            err.message
          }`
        );
      }
      throw e;
    }
    await this.savedObjectsClient.update(
      'alert',
      createdAlert.id,
      {
        scheduledTaskId: scheduledTask.id,
      },
      { references }
    );
    createdAlert.attributes.scheduledTaskId = scheduledTask.id;
    return this.getAlertFromRaw(createdAlert.id, createdAlert.attributes, references);
  }

  public async get({ id }: { id: string }) {
    const result = await this.savedObjectsClient.get('alert', id);
    return this.getAlertFromRaw(result.id, result.attributes, result.references);
  }

  public async find({ options = {} }: FindOptions = {}) {
    const results = await this.savedObjectsClient.find({
      ...options,
      type: 'alert',
    });
    return results.saved_objects.map(result =>
      this.getAlertFromRaw(result.id, result.attributes, result.references)
    );
  }

  public async delete({ id }: { id: string }) {
    const alertSavedObject = await this.savedObjectsClient.get('alert', id);
    const removeResult = await this.savedObjectsClient.delete('alert', id);
    await this.taskManager.remove(alertSavedObject.attributes.scheduledTaskId);
    return removeResult;
  }

  public async update({ id, data, options = {} }: UpdateOptions) {
    const existingObject = await this.savedObjectsClient.get('alert', id);
    const { alertTypeId } = existingObject.attributes;
    const alertType = this.alertTypeRegistry.get(alertTypeId);

    // Validate
    const validatedAlertTypeParams = validateAlertTypeParams(alertType, data.alertTypeParams);

    const { actions, references } = this.extractReferences(data.actions);
    const updatedObject = await this.savedObjectsClient.update(
      'alert',
      id,
      {
        ...data,
        alertTypeParams: validatedAlertTypeParams,
        actions,
      },
      {
        ...options,
        references,
      }
    );
    return this.getAlertFromRaw(id, updatedObject.attributes, updatedObject.references);
  }

  private async scheduleAlert(id: string, alert: RawAlert, basePath: string) {
    return await this.taskManager.schedule({
      taskType: `alerting:${alert.alertTypeId}`,
      params: {
        alertId: id,
        basePath,
      },
      state: {
        // This is here because we can't rely on the task manager's internal runAt.
        // It changes it for timeout, etc when a task is running.
        scheduledRunAt: new Date(Date.now() + alert.interval * 1000),
        previousScheduledRunAt: null,
        alertTypeState: {},
        alertInstances: {},
      },
      scope: ['alerting'],
    });
  }

  private extractReferences(actions: Alert['actions']) {
    const references: SavedObjectReference[] = [];
    const rawActions = actions.map((action, i) => {
      const actionRef = `action_${i}`;
      references.push({
        name: actionRef,
        type: 'action',
        id: action.id,
      });
      return {
        ...omit(action, 'id'),
        actionRef,
      };
    }) as RawAlert['actions'];
    return {
      actions: rawActions,
      references,
    };
  }

  private injectReferencesIntoActions(
    actions: RawAlert['actions'],
    references: SavedObjectReference[]
  ) {
    return actions.map((action, i) => {
      const reference = references.find(ref => ref.name === action.actionRef);
      if (!reference) {
        throw new Error(`Reference ${action.actionRef} not found`);
      }
      return {
        ...omit(action, 'actionRef'),
        id: reference.id,
      };
    }) as Alert['actions'];
  }

  private getAlertFromRaw(
    id: string,
    rawAlert: Partial<RawAlert>,
    references: SavedObjectReference[]
  ) {
    if (!rawAlert.actions) {
      return {
        id,
        ...rawAlert,
      };
    }
    const actions = this.injectReferencesIntoActions(rawAlert.actions, references);
    return {
      id,
      ...rawAlert,
      actions,
    };
  }

  private getRawAlert(alert: Alert): { alert: RawAlert; references: SavedObjectReference[] } {
    const { references, actions } = this.extractReferences(alert.actions);
    return {
      alert: {
        ...alert,
        actions,
      },
      references,
    };
  }
}
