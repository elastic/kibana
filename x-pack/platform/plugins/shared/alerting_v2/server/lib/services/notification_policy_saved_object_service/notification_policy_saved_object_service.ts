/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStart } from '@kbn/core-di';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { ISavedObjectsClientFactory } from '@kbn/core-di-server';
import { SavedObjectsClientFactory } from '@kbn/core-di-server';
import { inject, injectable } from 'inversify';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import { NOTIFICATION_POLICY_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { NotificationPolicySavedObjectAttributes } from '../../../saved_objects';
import type { AlertingServerStartDependencies } from '../../../types';
import { spaceIdToNamespace } from '../../space_id_to_namespace';

export interface NotificationPolicySavedObjectServiceContract {
  create(params: {
    attrs: NotificationPolicySavedObjectAttributes;
    id?: string;
  }): Promise<{ id: string; version?: string }>;
  get(
    id: string,
    spaceId?: string
  ): Promise<{ id: string; attributes: NotificationPolicySavedObjectAttributes; version?: string }>;
  update(params: {
    id: string;
    attrs: NotificationPolicySavedObjectAttributes;
    version: string;
  }): Promise<{ id: string; version?: string }>;
  delete(params: { id: string }): Promise<void>;
}

@injectable()
export class NotificationPolicySavedObjectService
  implements NotificationPolicySavedObjectServiceContract
{
  private readonly client: SavedObjectsClientContract;

  constructor(
    @inject(SavedObjectsClientFactory)
    private readonly savedObjectsClientFactory: ISavedObjectsClientFactory,
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart
  ) {
    this.client = this.savedObjectsClientFactory({
      includedHiddenTypes: [NOTIFICATION_POLICY_SAVED_OBJECT_TYPE],
    });
  }

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
    attrs: NotificationPolicySavedObjectAttributes;
    version: string;
  }): Promise<{ id: string; version?: string }> {
    const result = await this.client.update<NotificationPolicySavedObjectAttributes>(
      NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
      id,
      attrs,
      { version }
    );
    return { id: result.id, version: result.version };
  }

  public async delete({ id }: { id: string }): Promise<void> {
    await this.client.delete(NOTIFICATION_POLICY_SAVED_OBJECT_TYPE, id);
  }
}
