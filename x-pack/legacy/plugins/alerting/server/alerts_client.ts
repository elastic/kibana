/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { omit } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Logger, SavedObjectsClientContract, SavedObjectReference } from 'src/core/server';
import { Alert, RawAlert, AlertTypeRegistry, AlertAction, AlertType } from './types';
import { TaskManagerStartContract } from './shim';
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
type NormalizedAlertAction = Omit<AlertAction, 'actionTypeId'>;

interface ConstructorOptions {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  savedObjectsClient: SavedObjectsClientContract;
  alertTypeRegistry: AlertTypeRegistry;
  spaceId?: string;
  getUserName: () => Promise<string | null>;
  createAPIKey: () => Promise<CreateAPIKeyResult>;
}

export interface FindOptions {
  options?: {
    perPage?: number;
    page?: number;
    search?: string;
    defaultSearchOperator?: 'AND' | 'OR';
    searchFields?: string[];
    sortField?: string;
    sortOrder?: string;
    hasReference?: {
      type: string;
      id: string;
    };
    fields?: string[];
    filter?: string;
  };
}

interface FindResult {
  page: number;
  perPage: number;
  total: number;
  data: object[];
}

interface CreateOptions {
  data: Pick<
    Alert,
    Exclude<
      keyof Alert,
      | 'createdBy'
      | 'updatedBy'
      | 'apiKey'
      | 'apiKeyOwner'
      | 'muteAll'
      | 'mutedInstanceIds'
      | 'actions'
    >
  > & { actions: NormalizedAlertAction[] };
  options?: {
    migrationVersion?: Record<string, string>;
  };
}

interface UpdateOptions {
  id: string;
  data: {
    name: string;
    tags: string[];
    interval: string;
    actions: NormalizedAlertAction[];
    params: Record<string, any>;
  };
}

export class AlertsClient {
  private readonly logger: Logger;
  private readonly getUserName: () => Promise<string | null>;
  private readonly spaceId?: string;
  private readonly taskManager: TaskManagerStartContract;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly alertTypeRegistry: AlertTypeRegistry;
  private readonly createAPIKey: () => Promise<CreateAPIKeyResult>;

  constructor({
    alertTypeRegistry,
    savedObjectsClient,
    taskManager,
    logger,
    spaceId,
    getUserName,
    createAPIKey,
  }: ConstructorOptions) {
    this.logger = logger;
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
    const validatedAlertTypeParams = validateAlertTypeParams(alertType, data.params);
    const apiKey = await this.createAPIKey();
    const username = await this.getUserName();

    this.validateActions(alertType, data.actions);

    const { references, actions } = await this.denormalizeActions(data.actions);
    const rawAlert: RawAlert = {
      ...data,
      actions,
      createdBy: username,
      updatedBy: username,
      apiKeyOwner: apiKey.created && username ? username : undefined,
      apiKey: apiKey.created
        ? Buffer.from(`${apiKey.result.id}:${apiKey.result.api_key}`).toString('base64')
        : undefined,
      params: validatedAlertTypeParams,
      muteAll: false,
      mutedInstanceIds: [],
    };
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
          this.logger.error(
            `Failed to cleanup alert "${createdAlert.id}" after scheduling task failed. Error: ${err.message}`
          );
        }
        throw e;
      }
      await this.savedObjectsClient.update('alert', createdAlert.id, {
        scheduledTaskId: scheduledTask.id,
      });
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

  public async update({ id, data }: UpdateOptions) {
    const { attributes, version } = await this.savedObjectsClient.get('alert', id);
    const alertType = this.alertTypeRegistry.get(attributes.alertTypeId);
    const apiKey = await this.createAPIKey();

    // Validate
    const validatedAlertTypeParams = validateAlertTypeParams(alertType, data.params);
    this.validateActions(alertType, data.actions);

    const { actions, references } = await this.denormalizeActions(data.actions);
    const username = await this.getUserName();
    const updatedObject = await this.savedObjectsClient.update(
      'alert',
      id,
      {
        ...attributes,
        ...data,
        params: validatedAlertTypeParams,
        actions,
        updatedBy: username,
        apiKeyOwner: apiKey.created ? username : null,
        apiKey: apiKey.created
          ? Buffer.from(`${apiKey.result.id}:${apiKey.result.api_key}`).toString('base64')
          : null,
      },
      {
        version,
        references,
      }
    );
    return this.getAlertFromRaw(id, updatedObject.attributes, updatedObject.references);
  }

  public async updateApiKey({ id }: { id: string }) {
    const { version, attributes } = await this.savedObjectsClient.get('alert', id);

    const apiKey = await this.createAPIKey();
    const username = await this.getUserName();
    await this.savedObjectsClient.update(
      'alert',
      id,
      {
        ...attributes,
        updatedBy: username,
        apiKeyOwner: apiKey.created ? username : null,
        apiKey: apiKey.created
          ? Buffer.from(`${apiKey.result.id}:${apiKey.result.api_key}`).toString('base64')
          : null,
      },
      { version }
    );
  }

  public async enable({ id }: { id: string }) {
    const { attributes, version } = await this.savedObjectsClient.get('alert', id);
    if (attributes.enabled === false) {
      const apiKey = await this.createAPIKey();
      const scheduledTask = await this.scheduleAlert(
        id,
        attributes.alertTypeId,
        attributes.interval
      );
      const username = await this.getUserName();
      await this.savedObjectsClient.update(
        'alert',
        id,
        {
          ...attributes,
          enabled: true,
          updatedBy: username,
          apiKeyOwner: apiKey.created ? username : null,
          scheduledTaskId: scheduledTask.id,
          apiKey: apiKey.created
            ? Buffer.from(`${apiKey.result.id}:${apiKey.result.api_key}`).toString('base64')
            : null,
        },
        { version }
      );
    }
  }

  public async disable({ id }: { id: string }) {
    const { attributes, version } = await this.savedObjectsClient.get('alert', id);
    if (attributes.enabled === true) {
      await this.savedObjectsClient.update(
        'alert',
        id,
        {
          ...attributes,
          enabled: false,
          scheduledTaskId: null,
          apiKey: null,
          apiKeyOwner: null,
          updatedBy: await this.getUserName(),
        },
        { version }
      );
      await this.taskManager.remove(attributes.scheduledTaskId);
    }
  }

  public async muteAll({ id }: { id: string }) {
    await this.savedObjectsClient.update('alert', id, {
      muteAll: true,
      mutedInstanceIds: [],
      updatedBy: await this.getUserName(),
    });
  }

  public async unmuteAll({ id }: { id: string }) {
    await this.savedObjectsClient.update('alert', id, {
      muteAll: false,
      mutedInstanceIds: [],
      updatedBy: await this.getUserName(),
    });
  }

  public async muteInstance({
    alertId,
    alertInstanceId,
  }: {
    alertId: string;
    alertInstanceId: string;
  }) {
    const { attributes, version } = await this.savedObjectsClient.get('alert', alertId);
    const mutedInstanceIds = attributes.mutedInstanceIds || [];
    if (!attributes.muteAll && !mutedInstanceIds.includes(alertInstanceId)) {
      mutedInstanceIds.push(alertInstanceId);
      await this.savedObjectsClient.update(
        'alert',
        alertId,
        {
          mutedInstanceIds,
          updatedBy: await this.getUserName(),
        },
        { version }
      );
    }
  }

  public async unmuteInstance({
    alertId,
    alertInstanceId,
  }: {
    alertId: string;
    alertInstanceId: string;
  }) {
    const { attributes, version } = await this.savedObjectsClient.get('alert', alertId);
    const mutedInstanceIds = attributes.mutedInstanceIds || [];
    if (!attributes.muteAll && mutedInstanceIds.includes(alertInstanceId)) {
      await this.savedObjectsClient.update(
        'alert',
        alertId,
        {
          updatedBy: await this.getUserName(),
          mutedInstanceIds: mutedInstanceIds.filter((id: string) => id !== alertInstanceId),
        },
        { version }
      );
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
    references: SavedObjectReference[] | undefined
  ) {
    if (!rawAlert.actions) {
      return {
        id,
        ...rawAlert,
      };
    }
    const actions = this.injectReferencesIntoActions(rawAlert.actions, references || []);
    return {
      id,
      ...rawAlert,
      actions,
    };
  }

  private validateActions(alertType: AlertType, actions: NormalizedAlertAction[]): void {
    const { actionGroups: alertTypeActionGroups } = alertType;
    const usedAlertActionGroups = actions.map(action => action.group);
    const invalidActionGroups = usedAlertActionGroups.filter(
      group => !alertTypeActionGroups.includes(group)
    );
    if (invalidActionGroups.length) {
      throw Boom.badRequest(
        i18n.translate('xpack.alerting.alertsClient.validateActions.invalidGroups', {
          defaultMessage: 'Invalid action groups: {groups}',
          values: {
            groups: invalidActionGroups.join(', '),
          },
        })
      );
    }
  }

  private async denormalizeActions(
    alertActions: NormalizedAlertAction[]
  ): Promise<{ actions: RawAlert['actions']; references: SavedObjectReference[] }> {
    // Fetch action objects in bulk
    const actionIds = [...new Set(alertActions.map(alertAction => alertAction.id))];
    const bulkGetOpts = actionIds.map(id => ({ id, type: 'action' }));
    const bulkGetResult = await this.savedObjectsClient.bulkGet(bulkGetOpts);
    const actionMap = new Map<string, any>();
    for (const action of bulkGetResult.saved_objects) {
      if (action.error) {
        throw Boom.badRequest(
          `Failed to load action ${action.id} (${action.error.statusCode}): ${action.error.message}`
        );
      }
      actionMap.set(action.id, action);
    }
    // Extract references and set actionTypeId
    const references: SavedObjectReference[] = [];
    const actions = alertActions.map(({ id, ...alertAction }, i) => {
      const actionRef = `action_${i}`;
      references.push({
        id,
        name: actionRef,
        type: 'action',
      });
      return {
        ...alertAction,
        actionRef,
        actionTypeId: actionMap.get(id).attributes.actionTypeId,
      };
    });
    return {
      actions,
      references,
    };
  }
}
