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
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { RuleSavedObjectAttributes } from '../../../saved_objects';
import type { AlertingServerStartDependencies } from '../../../types';
import { spaceIdToNamespace } from '../../space_id_to_namespace';

export interface RulesSavedObjectServiceContract {
  create(params: { attrs: RuleSavedObjectAttributes; id?: string }): Promise<string>;
  get(
    id: string,
    spaceId?: string
  ): Promise<{ id: string; attributes: RuleSavedObjectAttributes; version?: string }>;
  update(params: { id: string; attrs: RuleSavedObjectAttributes; version?: string }): Promise<void>;
  delete(params: { id: string }): Promise<void>;
  find(params: { page: number; perPage: number }): Promise<{
    saved_objects: Array<{ id: string; attributes: RuleSavedObjectAttributes }>;
    total: number;
  }>;
}

@injectable()
export class RulesSavedObjectService implements RulesSavedObjectServiceContract {
  private readonly client: SavedObjectsClientContract;

  constructor(
    @inject(SavedObjectsClientFactory)
    private readonly savedObjectsClientFactory: ISavedObjectsClientFactory,
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart
  ) {
    this.client = this.savedObjectsClientFactory({
      includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
    });
  }
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

  public async delete({ id }: { id: string }): Promise<void> {
    await this.client.delete(RULE_SAVED_OBJECT_TYPE, id);
  }

  public async find({ page, perPage }: { page: number; perPage: number }) {
    return this.client.find<RuleSavedObjectAttributes>({
      type: RULE_SAVED_OBJECT_TYPE,
      page,
      perPage,
      sortField: 'updatedAt',
      sortOrder: 'desc',
    });
  }
}
