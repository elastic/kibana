/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObjectAttributes, SavedObject } from 'src/core/server';
import { ActionTypeRegistry } from './action_type_registry';
import { validateConfig, validateSecrets } from './lib';
import { ActionResult } from './types';
import { IAuditLog } from '../../../../plugins/audit_log/server/types';
import { AuditRecordType } from './audit_record';

interface ActionUpdate extends SavedObjectAttributes {
  description: string;
  config: SavedObjectAttributes;
  secrets: SavedObjectAttributes;
}

interface Action extends ActionUpdate {
  actionTypeId: string;
}

interface CreateOptions {
  action: Action;
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
  data: ActionResult[];
}

interface ConstructorOptions {
  actionTypeRegistry: ActionTypeRegistry;
  savedObjectsClient: SavedObjectsClientContract;
  auditLog: IAuditLog;
}

interface UpdateOptions {
  id: string;
  action: ActionUpdate;
}

export class ActionsClient {
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly actionTypeRegistry: ActionTypeRegistry;
  private readonly auditLog: IAuditLog;

  constructor({ actionTypeRegistry, savedObjectsClient, auditLog }: ConstructorOptions) {
    this.actionTypeRegistry = actionTypeRegistry;
    this.savedObjectsClient = savedObjectsClient;
    this.auditLog = auditLog;
  }

  /**
   * Create an action
   */
  public async create({ action }: CreateOptions): Promise<ActionResult> {
    const { actionTypeId, description, config, secrets } = action;
    const actionType = this.actionTypeRegistry.get(actionTypeId);
    const validatedActionTypeConfig = validateConfig(actionType, config);
    const validatedActionTypeSecrets = validateSecrets(actionType, secrets);

    const result = await this.savedObjectsClient.create('action', {
      actionTypeId,
      description,
      config: validatedActionTypeConfig as SavedObjectAttributes,
      secrets: validatedActionTypeSecrets as SavedObjectAttributes,
    });

    const auditRecord: AuditRecordType = {
      actionTypeId,
      id: result.id,
      operation: 'create',
      status: 'success',
      message: undefined,
    };
    this.auditLog.log(auditRecord);

    return {
      id: result.id,
      actionTypeId: result.attributes.actionTypeId,
      description: result.attributes.description,
      config: result.attributes.config,
    };
  }

  /**
   * Update action
   */
  public async update({ id, action }: UpdateOptions): Promise<ActionResult> {
    const existingObject = await this.savedObjectsClient.get('action', id);
    const { actionTypeId } = existingObject.attributes;
    const { description, config, secrets } = action;
    const actionType = this.actionTypeRegistry.get(actionTypeId);
    const validatedActionTypeConfig = validateConfig(actionType, config);
    const validatedActionTypeSecrets = validateSecrets(actionType, secrets);

    const result = await this.savedObjectsClient.update('action', id, {
      actionTypeId,
      description,
      config: validatedActionTypeConfig as SavedObjectAttributes,
      secrets: validatedActionTypeSecrets as SavedObjectAttributes,
    });

    const auditRecord: AuditRecordType = {
      actionTypeId,
      id: result.id,
      operation: 'update',
      status: 'success',
      message: undefined,
    };
    this.auditLog.log(auditRecord);

    return {
      id,
      actionTypeId: result.attributes.actionTypeId as string,
      description: result.attributes.description as string,
      config: result.attributes.config as Record<string, any>,
    };
  }

  /**
   * Get an action
   */
  public async get({ id }: { id: string }): Promise<ActionResult> {
    const result = await this.savedObjectsClient.get('action', id);

    return {
      id,
      actionTypeId: result.attributes.actionTypeId as string,
      description: result.attributes.description as string,
      config: result.attributes.config as Record<string, any>,
    };
  }

  /**
   * Find actions
   */
  public async find({ options = {} }: FindOptions): Promise<FindResult> {
    const findResult = await this.savedObjectsClient.find({
      ...options,
      type: 'action',
    });

    return {
      page: findResult.page,
      perPage: findResult.per_page,
      total: findResult.total,
      data: findResult.saved_objects.map(actionFromSavedObject),
    };
  }

  /**
   * Delete action
   */
  public async delete({ id }: { id: string }) {
    const action = await this.savedObjectsClient.get('action', id);
    const result = await this.savedObjectsClient.delete('action', id);

    const auditRecord: AuditRecordType = {
      actionTypeId: action.attributes.actionTypeId,
      id,
      operation: 'delete',
      status: 'success',
      message: undefined,
    };
    this.auditLog.log(auditRecord);

    return result;
  }
}

function actionFromSavedObject(savedObject: SavedObject) {
  return {
    id: savedObject.id,
    ...savedObject.attributes,
  };
}
