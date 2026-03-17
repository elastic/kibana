/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStart } from '@kbn/core-di';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { inject, injectable } from 'inversify';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import type { SavedObjectError } from '@kbn/core/types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { RuleSavedObjectAttributes } from '../../../saved_objects';
import type { AlertingServerStartDependencies } from '../../../types';
import { spaceIdToNamespace } from '../../space_id_to_namespace';
import { RuleSavedObjectsClientToken } from './tokens';

export type RulesSavedObjectsBulkGetResultItem =
  | {
      id: string;
      attributes: RuleSavedObjectAttributes;
      version?: string;
    }
  | {
      id: string;
      error: SavedObjectError;
    };

export type BulkDeleteResult = Array<
  { id: string; success: true } | { id: string; success: false; error: SavedObjectError }
>;

export type BulkUpdateResultItem =
  | { id: string; success: true }
  | { id: string; success: false; error: SavedObjectError };

export interface RulesSavedObjectServiceContract {
  create(params: { attrs: RuleSavedObjectAttributes; id?: string }): Promise<string>;
  get(
    id: string,
    spaceId?: string
  ): Promise<{ id: string; attributes: RuleSavedObjectAttributes; version?: string }>;
  bulkGetByIds(ids: string[], spaceId?: string): Promise<RulesSavedObjectsBulkGetResultItem[]>;
  update(params: { id: string; attrs: RuleSavedObjectAttributes; version?: string }): Promise<void>;
  bulkUpdate(
    items: Array<{ id: string; attrs: RuleSavedObjectAttributes; version?: string }>
  ): Promise<BulkUpdateResultItem[]>;
  delete(params: { id: string }): Promise<void>;
  bulkDelete(ids: string[]): Promise<BulkDeleteResult>;
  find(params: { page: number; perPage: number; filter?: string }): Promise<{
    saved_objects: Array<{ id: string; attributes: RuleSavedObjectAttributes }>;
    total: number;
  }>;
}

@injectable()
export class RulesSavedObjectService implements RulesSavedObjectServiceContract {
  constructor(
    @inject(RuleSavedObjectsClientToken)
    private readonly client: SavedObjectsClientContract,
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart
  ) {}
  public async create({
    attrs,
    id,
  }: {
    attrs: RuleSavedObjectAttributes;
    id?: string;
  }): Promise<string> {
    const ruleId = id ?? SavedObjectsUtils.generateId();
    await this.client.create<RuleSavedObjectAttributes>(RULE_SAVED_OBJECT_TYPE, attrs, {
      id: ruleId,
      overwrite: false,
    });
    return ruleId;
  }
  public async get(
    id: string,
    spaceId?: string
  ): Promise<{ id: string; attributes: RuleSavedObjectAttributes; version?: string }> {
    const namespace = spaceIdToNamespace(this.spaces, spaceId);
    const doc = await this.client.get<RuleSavedObjectAttributes>(
      RULE_SAVED_OBJECT_TYPE,
      id,
      namespace ? { namespace } : undefined
    );
    return { id: doc.id, attributes: doc.attributes, version: doc.version };
  }

  public async bulkGetByIds(
    ids: string[],
    spaceId?: string
  ): Promise<RulesSavedObjectsBulkGetResultItem[]> {
    const namespace = spaceIdToNamespace(this.spaces, spaceId);
    if (ids.length === 0) {
      return [];
    }

    const result = await this.client.bulkGet<RuleSavedObjectAttributes>(
      ids.map((id) => ({ type: RULE_SAVED_OBJECT_TYPE, id }), namespace ? { namespace } : undefined)
    );

    return result.saved_objects.map((doc) => {
      if ('error' in doc && doc.error) {
        return { id: doc.id, error: doc.error };
      }
      return { id: doc.id, attributes: doc.attributes, version: doc.version };
    });
  }

  public async update({
    id,
    attrs,
    version,
  }: {
    id: string;
    attrs: RuleSavedObjectAttributes;
    version?: string;
  }): Promise<void> {
    await this.client.update<RuleSavedObjectAttributes>(RULE_SAVED_OBJECT_TYPE, id, attrs, {
      ...(version ? { version } : {}),
    });
  }

  public async bulkUpdate(
    items: Array<{ id: string; attrs: RuleSavedObjectAttributes; version?: string }>
  ): Promise<BulkUpdateResultItem[]> {
    if (items.length === 0) {
      return [];
    }

    const result = await this.client.bulkUpdate<RuleSavedObjectAttributes>(
      items.map((item) => ({
        type: RULE_SAVED_OBJECT_TYPE,
        id: item.id,
        attributes: item.attrs,
        ...(item.version ? { version: item.version } : {}),
      }))
    );

    return result.saved_objects.map((doc) => {
      if ('error' in doc && doc.error) {
        return { id: doc.id, success: false as const, error: doc.error };
      }
      return { id: doc.id, success: true as const };
    });
  }

  public async delete({ id }: { id: string }): Promise<void> {
    await this.client.delete(RULE_SAVED_OBJECT_TYPE, id);
  }

  public async bulkDelete(ids: string[]): Promise<BulkDeleteResult> {
    if (ids.length === 0) {
      return [];
    }

    const result = await this.client.bulkDelete(
      ids.map((id) => ({ type: RULE_SAVED_OBJECT_TYPE, id }))
    );

    return result.statuses.map((status) => {
      if (status.success) {
        return { id: status.id, success: true as const };
      }
      return {
        id: status.id,
        success: false as const,
        error: status.error ?? { error: 'Unknown', message: 'Unknown error', statusCode: 500 },
      };
    });
  }

  public async find({ page, perPage, filter }: { page: number; perPage: number; filter?: string }) {
    return this.client.find<RuleSavedObjectAttributes>({
      type: RULE_SAVED_OBJECT_TYPE,
      page,
      perPage,
      sortField: 'updatedAt',
      sortOrder: 'desc',
      ...(filter ? { filter } : {}),
    });
  }
}
