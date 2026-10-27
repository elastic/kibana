/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStart } from '@kbn/core-di';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { isSavedObjectErrorResult, SavedObjectsUtils } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { inject, injectable } from 'inversify';
import type {
  ActionPolicySavedObjectAttributes,
  PartiallyUpdateableActionPolicyAttributes,
} from '../../../saved_objects';
import { ACTION_POLICY_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { AlertingServerStartDependencies } from '../../../types';
import { EncryptedSavedObjectsClientToken } from '../../dispatcher/steps/dispatch_step_tokens';
import { spaceIdToNamespace } from '../../space_id_to_namespace';
import { ActionPolicySavedObjectsClientToken } from './tokens';
import type {
  ActionPolicyRoutingTagSource,
  ActionPolicySavedObjectBulkDeleteItem,
  ActionPolicySavedObjectBulkGetItem,
  ActionPolicySavedObjectBulkUpdateItem,
  ActionPolicySavedObjectServiceContract,
} from './types';

export type {
  ActionPolicyRoutingTagSource,
  ActionPolicySavedObjectBulkDeleteItem,
  ActionPolicySavedObjectBulkGetItem,
  ActionPolicySavedObjectBulkUpdateItem,
  ActionPolicySavedObjectServiceContract,
};

const ROUTING_TAG_SOURCES_PER_PAGE = 1000;

@injectable()
export class ActionPolicySavedObjectService implements ActionPolicySavedObjectServiceContract {
  constructor(
    @inject(ActionPolicySavedObjectsClientToken)
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
    attrs: ActionPolicySavedObjectAttributes;
    id?: string;
  }): Promise<{ id: string; version?: string }> {
    const actionPolicyId = id ?? SavedObjectsUtils.generateId();
    const result = await this.client.create<ActionPolicySavedObjectAttributes>(
      ACTION_POLICY_SAVED_OBJECT_TYPE,
      attrs,
      {
        id: actionPolicyId,
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
    attributes: ActionPolicySavedObjectAttributes;
    version?: string;
  }> {
    const namespace = spaceIdToNamespace(this.spaces, spaceId);
    const doc = await this.client.get<ActionPolicySavedObjectAttributes>(
      ACTION_POLICY_SAVED_OBJECT_TYPE,
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
    attrs: ActionPolicySavedObjectAttributes;
    version?: string;
  }): Promise<{ id: string; version?: string }> {
    const result = await this.client.update<ActionPolicySavedObjectAttributes>(
      ACTION_POLICY_SAVED_OBJECT_TYPE,
      id,
      attrs,
      { ...(version ? { version } : {}), mergeAttributes: false }
    );

    return { id: result.id, version: result.version };
  }

  /**
   * Writes server-owned fields onto the stored document, leaving the rest untouched. Restricted to
   * flat fields the caller owns entirely, so the saved object's deep merge has nothing to resurrect.
   */
  public async patchFields({
    id,
    attrs,
  }: {
    id: string;
    attrs: PartiallyUpdateableActionPolicyAttributes;
  }): Promise<{ id: string; version?: string }> {
    const result = await this.client.update<ActionPolicySavedObjectAttributes>(
      ACTION_POLICY_SAVED_OBJECT_TYPE,
      id,
      attrs
    );

    return { id: result.id, version: result.version };
  }

  /**
   * Writes server-owned fields across many policies. These are flat fields the caller owns, so the
   * saved object's deep merge is what preserves everything else; it must stay enabled here.
   */
  public async bulkUpdate({
    objects,
  }: {
    objects: Array<{
      id: string;
      attrs: PartiallyUpdateableActionPolicyAttributes;
    }>;
  }): Promise<ActionPolicySavedObjectBulkUpdateItem[]> {
    if (objects.length === 0) {
      return [];
    }

    const result = await this.client.bulkUpdate<ActionPolicySavedObjectAttributes>(
      objects.map(({ id, attrs }) => ({
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        id,
        attributes: attrs,
      }))
    );

    return result.saved_objects.map((savedObject) => {
      if (isSavedObjectErrorResult(savedObject)) {
        return { id: savedObject.id, error: savedObject.error };
      }
      return { id: savedObject.id, version: savedObject.version };
    });
  }

  public async bulkGetByIds(
    ids: string[],
    spaceId?: string
  ): Promise<ActionPolicySavedObjectBulkGetItem[]> {
    if (ids.length === 0) {
      return [];
    }

    const namespace = spaceIdToNamespace(this.spaces, spaceId);
    const result = await this.client.bulkGet<ActionPolicySavedObjectAttributes>(
      ids.map((id) => ({ type: ACTION_POLICY_SAVED_OBJECT_TYPE, id })),
      namespace ? { namespace } : undefined
    );

    return result.saved_objects.map((savedObject) => {
      if (isSavedObjectErrorResult(savedObject)) {
        return { id: savedObject.id, error: savedObject.error };
      }

      return {
        id: savedObject.id,
        attributes: savedObject.attributes,
        version: savedObject.version,
      };
    });
  }

  public async findAllDecrypted(params?: {
    filter?: { enabled: boolean };
  }): Promise<ActionPolicySavedObjectBulkGetItem[]> {
    const kqlFilter =
      params?.filter?.enabled !== undefined
        ? `${ACTION_POLICY_SAVED_OBJECT_TYPE}.attributes.enabled: ${params.filter.enabled}`
        : undefined;

    const finder =
      await this.encryptedSavedObjectsClient.createPointInTimeFinderDecryptedAsInternalUser<ActionPolicySavedObjectAttributes>(
        {
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          namespaces: ['*'],
          perPage: 1000,
          ...(kqlFilter ? { filter: kqlFilter } : {}),
        }
      );

    const results: ActionPolicySavedObjectBulkGetItem[] = [];

    for await (const response of finder.find()) {
      for (const doc of response.saved_objects) {
        if (isSavedObjectErrorResult(doc)) {
          results.push({ id: doc.id, error: doc.error });
        } else {
          results.push({ id: doc.id, attributes: doc.attributes, namespaces: doc.namespaces });
        }
      }
    }

    await finder.close();

    return results;
  }

  public async findRoutingTagSources({ maxPolicies }: { maxPolicies: number }): Promise<{
    policies: ActionPolicyRoutingTagSource[];
    isTruncated: boolean;
  }> {
    const finder = await this.client.createPointInTimeFinder<ActionPolicySavedObjectAttributes>({
      type: ACTION_POLICY_SAVED_OBJECT_TYPE,
      perPage: ROUTING_TAG_SOURCES_PER_PAGE,
      fields: ['name', 'enabled', 'matcher'],
    });

    const policies: ActionPolicyRoutingTagSource[] = [];
    let isTruncated = false;

    try {
      for await (const { saved_objects: savedObjects, total } of finder.find()) {
        for (const { id, attributes } of savedObjects) {
          policies.push({
            id,
            name: attributes.name,
            enabled: attributes.enabled,
            matcher: attributes.matcher,
          });
        }

        if (policies.length >= maxPolicies) {
          isTruncated = total > maxPolicies;
          break;
        }
      }
    } finally {
      await finder.close();
    }

    return { policies: policies.slice(0, maxPolicies), isTruncated };
  }

  public async delete({ id }: { id: string }): Promise<void> {
    await this.client.delete(ACTION_POLICY_SAVED_OBJECT_TYPE, id);
  }

  public async bulkDelete({
    ids,
  }: {
    ids: string[];
  }): Promise<ActionPolicySavedObjectBulkDeleteItem[]> {
    if (ids.length === 0) {
      return [];
    }

    const result = await this.client.bulkDelete(
      ids.map((id) => ({ type: ACTION_POLICY_SAVED_OBJECT_TYPE, id }))
    );

    return result.statuses.map((status) => {
      if (status.error) {
        return { id: status.id, error: status.error };
      }
      return { id: status.id };
    });
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
    filter?: string;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    return this.client.find<ActionPolicySavedObjectAttributes>({
      type: ACTION_POLICY_SAVED_OBJECT_TYPE,
      page,
      perPage,
      ...(search
        ? {
            search,
            searchFields: ['name', 'description'],
            defaultSearchOperator: 'AND' as const,
          }
        : {}),
      filter,
      sortField,
      sortOrder,
    });
  }
}
