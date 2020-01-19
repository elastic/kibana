/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { omit, isEqual } from 'lodash';
import { i18n } from '@kbn/i18n';
import {
  Logger,
  SavedObjectsClientContract,
  SavedObjectReference,
  SavedObject,
} from 'src/core/server';
import {
  Alert,
  PartialAlert,
  RawAlert,
  AlertTypeRegistry,
  AlertAction,
  AlertType,
  IntervalSchedule,
} from './types';
import { validateAlertTypeParams } from './lib';
import {
  InvalidateAPIKeyParams,
  CreateAPIKeyResult as SecurityPluginCreateAPIKeyResult,
  InvalidateAPIKeyResult as SecurityPluginInvalidateAPIKeyResult,
} from '../../../../plugins/security/server';
import { PluginStartContract as EncryptedSavedObjectsStartContract } from '../../../../plugins/encrypted_saved_objects/server';
import { TaskManagerStartContract } from '../../../../plugins/task_manager/server';

type NormalizedAlertAction = Omit<AlertAction, 'actionTypeId'>;
export type CreateAPIKeyResult =
  | { apiKeysEnabled: false }
  | { apiKeysEnabled: true; result: SecurityPluginCreateAPIKeyResult };
export type InvalidateAPIKeyResult =
  | { apiKeysEnabled: false }
  | { apiKeysEnabled: true; result: SecurityPluginInvalidateAPIKeyResult };

interface ConstructorOptions {
  logger: Logger;
  taskManager: TaskManagerStartContract;
  savedObjectsClient: SavedObjectsClientContract;
  alertTypeRegistry: AlertTypeRegistry;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsStartContract;
  spaceId?: string;
  namespace?: string;
  getUserName: () => Promise<string | null>;
  createAPIKey: () => Promise<CreateAPIKeyResult>;
  invalidateAPIKey: (params: InvalidateAPIKeyParams) => Promise<InvalidateAPIKeyResult>;
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

export interface FindResult {
  page: number;
  perPage: number;
  total: number;
  data: Alert[];
}

interface CreateOptions {
  data: Omit<
    Alert,
    | 'id'
    | 'createdBy'
    | 'updatedBy'
    | 'createdAt'
    | 'updatedAt'
    | 'apiKey'
    | 'apiKeyOwner'
    | 'muteAll'
    | 'mutedInstanceIds'
    | 'actions'
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
    schedule: IntervalSchedule;
    actions: NormalizedAlertAction[];
    params: Record<string, any>;
  };
}

export class AlertsClient {
  private readonly logger: Logger;
  private readonly getUserName: () => Promise<string | null>;
  private readonly spaceId?: string;
  private readonly namespace?: string;
  private readonly taskManager: TaskManagerStartContract;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly alertTypeRegistry: AlertTypeRegistry;
  private readonly createAPIKey: () => Promise<CreateAPIKeyResult>;
  private readonly invalidateAPIKey: (
    params: InvalidateAPIKeyParams
  ) => Promise<InvalidateAPIKeyResult>;
  encryptedSavedObjectsPlugin: EncryptedSavedObjectsStartContract;

  constructor({
    alertTypeRegistry,
    savedObjectsClient,
    taskManager,
    logger,
    spaceId,
    namespace,
    getUserName,
    createAPIKey,
    invalidateAPIKey,
    encryptedSavedObjectsPlugin,
  }: ConstructorOptions) {
    this.logger = logger;
    this.getUserName = getUserName;
    this.spaceId = spaceId;
    this.namespace = namespace;
    this.taskManager = taskManager;
    this.alertTypeRegistry = alertTypeRegistry;
    this.savedObjectsClient = savedObjectsClient;
    this.createAPIKey = createAPIKey;
    this.invalidateAPIKey = invalidateAPIKey;
    this.encryptedSavedObjectsPlugin = encryptedSavedObjectsPlugin;
  }

  public async create({ data, options }: CreateOptions): Promise<Alert> {
    // Throws an error if alert type isn't registered
    const alertType = this.alertTypeRegistry.get(data.alertTypeId);
    const validatedAlertTypeParams = validateAlertTypeParams(alertType, data.params);
    const username = await this.getUserName();

    this.validateActions(alertType, data.actions);

    const { references, actions } = await this.denormalizeActions(data.actions);
    const rawAlert: RawAlert = {
      ...data,
      ...this.apiKeyAsAlertAttributes(await this.createAPIKey(), username),
      actions,
      createdBy: username,
      updatedBy: username,
      createdAt: new Date().toISOString(),
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
        scheduledTask = await this.scheduleAlert(createdAlert.id, rawAlert.alertTypeId);
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
    return this.getAlertFromRaw(
      createdAlert.id,
      createdAlert.attributes,
      createdAlert.updated_at,
      references
    );
  }

  public async get({ id }: { id: string }): Promise<Alert> {
    const result = await this.savedObjectsClient.get('alert', id);
    return this.getAlertFromRaw(result.id, result.attributes, result.updated_at, result.references);
  }

  public async find({ options = {} }: FindOptions = {}): Promise<FindResult> {
    const {
      page,
      per_page: perPage,
      total,
      saved_objects: data,
    } = await this.savedObjectsClient.find<RawAlert>({
      ...options,
      type: 'alert',
    });

    return {
      page,
      perPage,
      total,
      data: data.map(({ id, attributes, updated_at, references }) =>
        this.getAlertFromRaw(id, attributes, updated_at, references)
      ),
    };
  }

  public async delete({ id }: { id: string }) {
    const decryptedAlertSavedObject = await this.encryptedSavedObjectsPlugin.getDecryptedAsInternalUser<
      RawAlert
    >('alert', id, { namespace: this.namespace });
    const removeResult = await this.savedObjectsClient.delete('alert', id);
    if (decryptedAlertSavedObject.attributes.scheduledTaskId) {
      await this.taskManager.remove(decryptedAlertSavedObject.attributes.scheduledTaskId);
    }
    await this.invalidateApiKey({ apiKey: decryptedAlertSavedObject.attributes.apiKey });
    return removeResult;
  }

  public async update({ id, data }: UpdateOptions): Promise<PartialAlert> {
    const decryptedAlertSavedObject = await this.encryptedSavedObjectsPlugin.getDecryptedAsInternalUser<
      RawAlert
    >('alert', id, { namespace: this.namespace });
    const updateResult = await this.updateAlert({ id, data }, decryptedAlertSavedObject);

    if (
      updateResult.scheduledTaskId &&
      !isEqual(decryptedAlertSavedObject.attributes.schedule, updateResult.schedule)
    ) {
      this.taskManager.runNow(updateResult.scheduledTaskId).catch((err: Error) => {
        this.logger.error(
          `Alert update failed to run its underlying task. TaskManager runNow failed with Error: ${err.message}`
        );
      });
    }

    return updateResult;
  }

  private async updateAlert(
    { id, data }: UpdateOptions,
    { attributes, version }: SavedObject<RawAlert>
  ): Promise<PartialAlert> {
    const alertType = this.alertTypeRegistry.get(attributes.alertTypeId);

    // Validate
    const validatedAlertTypeParams = validateAlertTypeParams(alertType, data.params);
    this.validateActions(alertType, data.actions);

    const { actions, references } = await this.denormalizeActions(data.actions);
    const username = await this.getUserName();
    const apiKeyAttributes = this.apiKeyAsAlertAttributes(await this.createAPIKey(), username);

    const updatedObject = await this.savedObjectsClient.update<RawAlert>(
      'alert',
      id,
      {
        ...attributes,
        ...data,
        ...apiKeyAttributes,
        params: validatedAlertTypeParams,
        actions,
        updatedBy: username,
      },
      {
        version,
        references,
      }
    );

    await this.invalidateApiKey({ apiKey: attributes.apiKey });

    return this.getPartialAlertFromRaw(
      id,
      updatedObject.attributes,
      updatedObject.updated_at,
      updatedObject.references
    );
  }

  private apiKeyAsAlertAttributes(
    apiKey: CreateAPIKeyResult,
    username: string | null
  ): Pick<RawAlert, 'apiKey' | 'apiKeyOwner'> {
    return apiKey.apiKeysEnabled
      ? {
          apiKeyOwner: username,
          apiKey: Buffer.from(`${apiKey.result.id}:${apiKey.result.api_key}`).toString('base64'),
        }
      : {
          apiKeyOwner: null,
          apiKey: null,
        };
  }

  public async updateApiKey({ id }: { id: string }) {
    const {
      version,
      attributes,
    } = await this.encryptedSavedObjectsPlugin.getDecryptedAsInternalUser<RawAlert>('alert', id, {
      namespace: this.namespace,
    });

    const username = await this.getUserName();
    await this.savedObjectsClient.update(
      'alert',
      id,
      {
        ...attributes,
        ...this.apiKeyAsAlertAttributes(await this.createAPIKey(), username),
        updatedBy: username,
      },
      { version }
    );

    await this.invalidateApiKey({ apiKey: attributes.apiKey });
  }

  private async invalidateApiKey({ apiKey }: { apiKey: string | null }): Promise<void> {
    if (!apiKey) {
      return;
    }

    try {
      const apiKeyId = Buffer.from(apiKey, 'base64')
        .toString()
        .split(':')[0];
      const response = await this.invalidateAPIKey({ id: apiKeyId });
      if (response.apiKeysEnabled === true && response.result.error_count > 0) {
        this.logger.error(`Failed to invalidate API Key [id="${apiKeyId}"]`);
      }
    } catch (e) {
      this.logger.error(`Failed to invalidate API Key: ${e.message}`);
    }
  }

  public async enable({ id }: { id: string }) {
    const {
      version,
      attributes,
    } = await this.encryptedSavedObjectsPlugin.getDecryptedAsInternalUser<RawAlert>('alert', id, {
      namespace: this.namespace,
    });

    if (attributes.enabled === false) {
      const username = await this.getUserName();
      await this.savedObjectsClient.update(
        'alert',
        id,
        {
          ...attributes,
          enabled: true,
          ...this.apiKeyAsAlertAttributes(await this.createAPIKey(), username),
          updatedBy: username,
        },
        { version }
      );
      const scheduledTask = await this.scheduleAlert(id, attributes.alertTypeId);
      await this.savedObjectsClient.update('alert', id, { scheduledTaskId: scheduledTask.id });
      await this.invalidateApiKey({ apiKey: attributes.apiKey });
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

  private async scheduleAlert(id: string, alertTypeId: string) {
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
    rawAlert: RawAlert,
    updatedAt: SavedObject['updated_at'],
    references: SavedObjectReference[] | undefined
  ): Alert {
    // In order to support the partial update API of Saved Objects we have to support
    // partial updates of an Alert, but when we receive an actual RawAlert, it is safe
    // to cast the result to an Alert
    return this.getPartialAlertFromRaw(id, rawAlert, updatedAt, references) as Alert;
  }

  private getPartialAlertFromRaw(
    id: string,
    rawAlert: Partial<RawAlert>,
    updatedAt: SavedObject['updated_at'],
    references: SavedObjectReference[] | undefined
  ): PartialAlert {
    return {
      id,
      ...rawAlert,
      // we currently only support the Interval Schedule type
      // Once we support additional types, this type signature will likely change
      schedule: rawAlert.schedule as IntervalSchedule,
      updatedAt: updatedAt ? new Date(updatedAt) : new Date(rawAlert.createdAt!),
      createdAt: new Date(rawAlert.createdAt!),
      actions: rawAlert.actions
        ? this.injectReferencesIntoActions(rawAlert.actions, references || [])
        : [],
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
