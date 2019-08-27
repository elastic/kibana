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
import { CreateAPIKeyResult as SecurityPluginCreateAPIKeyResult } from '../../../../plugins/security/server';

interface FailedCreateAPIKeyResult {
  created: false;
}
interface SuccessCreateAPIKeyResult {
  created: true;
  result: SecurityPluginCreateAPIKeyResult;
}
export type CreateAPIKeyResult = FailedCreateAPIKeyResult | SuccessCreateAPIKeyResult;

interface ConstructorOptions {
  log: Log;
  taskManager: TaskManager;
  savedObjectsClient: SavedObjectsClientContract;
  alertTypeRegistry: AlertTypeRegistry;
  spaceId?: string;
  getUserName: () => Promise<string | null>;
  createAPIKey: () => Promise<CreateAPIKeyResult>;
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

interface FindResult {
  page: number;
  perPage: number;
  total: number;
  data: object[];
}

interface CreateOptions {
  data: Pick<Alert, Exclude<keyof Alert, 'createdBy' | 'updatedBy' | 'apiKey' | 'apiKeyOwner'>>;
  options?: {
    migrationVersion?: Record<string, string>;
  };
}

interface UpdateOptions {
  id: string;
  data: {
    interval: string;
    actions: AlertAction[];
    alertTypeParams: Record<string, any>;
  };
  options?: { version?: string };
}

export class AlertsClient {
  private readonly log: Log;
  private readonly getUserName: () => Promise<string | null>;
  private readonly spaceId?: string;
  private readonly taskManager: TaskManager;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly alertTypeRegistry: AlertTypeRegistry;
  private readonly createAPIKey: () => Promise<CreateAPIKeyResult>;

  constructor({
    alertTypeRegistry,
    savedObjectsClient,
    taskManager,
    log,
    spaceId,
    getUserName,
    createAPIKey,
  }: ConstructorOptions) {
    this.log = log;
    this.getUserName = getUserName;
    this.spaceId = spaceId;
    this.taskManager = taskManager;
    this.alertTypeRegistry = alertTypeRegistry;
    this.savedObjectsClient = savedObjectsClient;
    this.createAPIKey = createAPIKey;
  }

  public async create({ data, options }: CreateOptions) {
    // Throws an error if alert type isn't registered
    const alertType = this.alertTypeRegistry.get(data.alertTypeId);
    const validatedAlertTypeParams = validateAlertTypeParams(alertType, data.alertTypeParams);
    const apiKey = await this.createAPIKey();
    const username = await this.getUserName();
    const { alert: rawAlert, references } = this.getRawAlert({
      ...data,
      createdBy: username,
      updatedBy: username,
      apiKeyOwner: apiKey.created && username ? username : undefined,
      apiKey: apiKey.created
        ? Buffer.from(`${apiKey.result.id}:${apiKey.result.api_key}`).toString('base64')
        : undefined,
      alertTypeParams: validatedAlertTypeParams,
    });
    const createdAlert = await this.savedObjectsClient.create('alert', rawAlert, {
      ...options,
      references,
    });
    if (data.enabled) {
      let scheduledTask;
      try {
        scheduledTask = await this.scheduleAlert(
          createdAlert.id,
          rawAlert.alertTypeId,
          rawAlert.interval
        );
      } catch (e) {
        // Cleanup data, something went wrong scheduling the task
        try {
          await this.savedObjectsClient.delete('alert', createdAlert.id);
        } catch (err) {
          // Skip the cleanup error and throw the task manager error to avoid confusion
          this.log(
            ['alerting', 'error'],
            `Failed to cleanup alert "${createdAlert.id}" after scheduling task failed. Error: ${err.message}`
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
    }
    return this.getAlertFromRaw(createdAlert.id, createdAlert.attributes, references);
  }

  public async get({ id }: { id: string }) {
    const result = await this.savedObjectsClient.get('alert', id);
    return this.getAlertFromRaw(result.id, result.attributes, result.references);
  }

  public async find({ options = {} }: FindOptions = {}): Promise<FindResult> {
    const results = await this.savedObjectsClient.find({
      ...options,
      type: 'alert',
    });

    const data = results.saved_objects.map(result =>
      this.getAlertFromRaw(result.id, result.attributes, result.references)
    );

    return {
      page: results.page,
      perPage: results.per_page,
      total: results.total,
      data,
    };
  }

  public async delete({ id }: { id: string }) {
    const alertSavedObject = await this.savedObjectsClient.get('alert', id);
    const removeResult = await this.savedObjectsClient.delete('alert', id);
    if (alertSavedObject.attributes.scheduledTaskId) {
      await this.taskManager.remove(alertSavedObject.attributes.scheduledTaskId);
    }
    return removeResult;
  }

  public async update({ id, data, options = {} }: UpdateOptions) {
    const existingObject = await this.savedObjectsClient.get('alert', id);
    const { alertTypeId } = existingObject.attributes;
    const alertType = this.alertTypeRegistry.get(alertTypeId);
    const apiKey = await this.createAPIKey();

    // Validate
    const validatedAlertTypeParams = validateAlertTypeParams(alertType, data.alertTypeParams);

    const { actions, references } = this.extractReferences(data.actions);
    const username = await this.getUserName();
    const updatedObject = await this.savedObjectsClient.update(
      'alert',
      id,
      {
        ...data,
        alertTypeParams: validatedAlertTypeParams,
        actions,
        updatedBy: username,
        apiKeyOwner: apiKey.created ? username : null,
        apiKey: apiKey.created
          ? Buffer.from(`${apiKey.result.id}:${apiKey.result.api_key}`).toString('base64')
          : null,
      },
      {
        ...options,
        references,
      }
    );
    return this.getAlertFromRaw(id, updatedObject.attributes, updatedObject.references);
  }

  public async enable({ id }: { id: string }) {
    const existingObject = await this.savedObjectsClient.get('alert', id);
    if (existingObject.attributes.enabled === false) {
      const apiKey = await this.createAPIKey();
      const scheduledTask = await this.scheduleAlert(
        id,
        existingObject.attributes.alertTypeId,
        existingObject.attributes.interval
      );
      const username = await this.getUserName();
      await this.savedObjectsClient.update(
        'alert',
        id,
        {
          enabled: true,
          updatedBy: username,
          apiKeyOwner: apiKey.created ? username : null,
          scheduledTaskId: scheduledTask.id,
          apiKey: apiKey.created
            ? Buffer.from(`${apiKey.result.id}:${apiKey.result.api_key}`).toString('base64')
            : null,
        },
        { references: existingObject.references }
      );
    }
  }

  public async disable({ id }: { id: string }) {
    const existingObject = await this.savedObjectsClient.get('alert', id);
    if (existingObject.attributes.enabled === true) {
      await this.savedObjectsClient.update(
        'alert',
        id,
        {
          enabled: false,
          scheduledTaskId: null,
          apiKey: null,
          apiKeyOwner: null,
          updatedBy: await this.getUserName(),
        },
        { references: existingObject.references }
      );
      await this.taskManager.remove(existingObject.attributes.scheduledTaskId);
    }
  }

  private async scheduleAlert(id: string, alertTypeId: string, interval: string) {
    return await this.taskManager.schedule({
      taskType: `alerting:${alertTypeId}`,
      params: {
        alertId: id,
        spaceId: this.spaceId,
      },
      state: {
        previousStartedAt: null,
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
