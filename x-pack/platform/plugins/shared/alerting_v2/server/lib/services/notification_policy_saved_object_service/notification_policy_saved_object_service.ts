/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStart } from '@kbn/core-di';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import type { SavedObjectError } from '@kbn/core/types';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { KueryNode } from '@kbn/es-query';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { inject, injectable } from 'inversify';
import type { NotificationPolicySavedObjectAttributes } from '../../../saved_objects';
import { NOTIFICATION_POLICY_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { AlertingServerStartDependencies } from '../../../types';
import { EncryptedSavedObjectsClientToken } from '../../dispatcher/steps/dispatch_step_tokens';
import { spaceIdToNamespace } from '../../space_id_to_namespace';
import { NotificationPolicySavedObjectsClientToken } from './tokens';

export type NotificationPolicySavedObjectBulkGetItem =
  | {
      id: string;
      attributes: NotificationPolicySavedObjectAttributes;
      version?: string;
    }
  | {
      id: string;
      error: SavedObjectError;
    };

export type NotificationPolicySavedObjectBulkUpdateItem =
  | { id: string; version?: string }
  | { id: string; error: SavedObjectError };

export interface NotificationPolicySavedObjectServiceContract {
  create(params: {
    attrs: NotificationPolicySavedObjectAttributes;
    id?: string;
  }): Promise<{ id: string; version?: string }>;
  get(
    id: string,
    spaceId?: string
  ): Promise<{ id: string; attributes: NotificationPolicySavedObjectAttributes; version?: string }>;
  bulkGetByIds(
    ids: string[],
    spaceId?: string
  ): Promise<NotificationPolicySavedObjectBulkGetItem[]>;
  update(params: {
    id: string;
    attrs: Partial<NotificationPolicySavedObjectAttributes>;
    version?: string;
  }): Promise<{ id: string; version?: string }>;
  bulkUpdate(params: {
    objects: Array<{
      id: string;
      attrs: Partial<NotificationPolicySavedObjectAttributes>;
    }>;
  }): Promise<NotificationPolicySavedObjectBulkUpdateItem[]>;
  findAllDecrypted(): Promise<NotificationPolicySavedObjectBulkGetItem[]>;
  delete(params: { id: string }): Promise<void>;
  find(params: {
    page: number;
    perPage: number;
    search?: string;
    filter?: KueryNode;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    saved_objects: Array<{
      id: string;
      attributes: NotificationPolicySavedObjectAttributes;
      version?: string;
    }>;
    total: number;
  }>;
}

@injectable()
export class NotificationPolicySavedObjectService
  implements NotificationPolicySavedObjectServiceContract
{
  constructor(
    @inject(NotificationPolicySavedObjectsClientToken)
    private readonly client: SavedObjectsClientContract,
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart,
    @inject(EncryptedSavedObjectsClientToken)
    private readonly encryptedSavedObjectsClient: EncryptedSavedObjectsClient
  ) {}

  public async create({
    attrs,
    id,
  }: {
    attrs: NotificationPolicySavedObjectAttributes;
    id?: string;
  }): Promise<{ id: string; version?: string }> {
    const notificationPolicyId = id ?? SavedObjectsUtils.generateId();
    const result = await this.client.create<NotificationPolicySavedObjectAttributes>(
      NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
      attrs,
      {
        id: notificationPolicyId,
        overwrite: false,
      }
    );

    return { id: result.id, version: result.version };
  }

  public async get(
    id: string,
    spaceId?: string
  ): Promise<{
    id: string;
    attributes: NotificationPolicySavedObjectAttributes;
    version?: string;
  }> {
    const namespace = spaceIdToNamespace(this.spaces, spaceId);
    const doc = await this.client.get<NotificationPolicySavedObjectAttributes>(
      NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
      id,
      namespace ? { namespace } : undefined
    );
    return { id: doc.id, attributes: doc.attributes, version: doc.version };
  }

  public async update({
    id,
    attrs,
    version,
  }: {
    id: string;
    attrs: Partial<NotificationPolicySavedObjectAttributes>;
    version?: string;
  }): Promise<{ id: string; version?: string }> {
    const result = await this.client.update<NotificationPolicySavedObjectAttributes>(
      NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
      id,
      attrs,
      version ? { version } : undefined
    );

    return { id: result.id, version: result.version };
  }

  public async bulkUpdate({
    objects,
  }: {
    objects: Array<{
      id: string;
      attrs: Partial<NotificationPolicySavedObjectAttributes>;
    }>;
  }): Promise<NotificationPolicySavedObjectBulkUpdateItem[]> {
    if (objects.length === 0) {
      return [];
    }

    const result = await this.client.bulkUpdate<NotificationPolicySavedObjectAttributes>(
      objects.map(({ id, attrs }) => ({
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        id,
        attributes: attrs,
      }))
    );

    return result.saved_objects.map((savedObject) => {
      if ('error' in savedObject && savedObject.error) {
        return { id: savedObject.id, error: savedObject.error };
      }
      return { id: savedObject.id, version: savedObject.version };
    });
  }

  public async bulkGetByIds(
    ids: string[],
    spaceId?: string
  ): Promise<NotificationPolicySavedObjectBulkGetItem[]> {
    if (ids.length === 0) {
      return [];
    }

    const namespace = spaceIdToNamespace(this.spaces, spaceId);
    const result = await this.client.bulkGet<NotificationPolicySavedObjectAttributes>(
      ids.map((id) => ({ type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE, id })),
      namespace ? { namespace } : undefined
    );

    return result.saved_objects.map((savedObject) => {
      if ('error' in savedObject && savedObject.error) {
        return { id: savedObject.id, error: savedObject.error };
      }

      return {
        id: savedObject.id,
        attributes: savedObject.attributes,
        version: savedObject.version,
      };
    });
  }

  public async findAllDecrypted(): Promise<NotificationPolicySavedObjectBulkGetItem[]> {
    const finder =
      await this.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<NotificationPolicySavedObjectAttributes>(
        { type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE }
      );

    const results: NotificationPolicySavedObjectBulkGetItem[] = [];

    for await (const response of finder.find()) {
      for (const doc of response.saved_objects) {
        if (doc.error) {
          results.push({ id: doc.id, error: doc.error });
        } else {
          results.push({ id: doc.id, attributes: doc.attributes });
        }
      }
    }

    await finder.close();

    return results;
  }

  public async delete({ id }: { id: string }): Promise<void> {
    await this.client.delete(NOTIFICATION_POLICY_SAVED_OBJECT_TYPE, id);
  }

  public async find({
    page,
    perPage,
    search,
    filter,
    sortField = 'name.keyword',
    sortOrder = 'asc',
  }: {
    page: number;
    perPage: number;
    search?: string;
    filter?: KueryNode;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    return this.client.find<NotificationPolicySavedObjectAttributes>({
      type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
      page,
      perPage,
      search,
      searchFields: search ? ['name', 'description', 'destinations.id'] : undefined,
      filter,
      sortField,
      sortOrder,
    });
  }
}
