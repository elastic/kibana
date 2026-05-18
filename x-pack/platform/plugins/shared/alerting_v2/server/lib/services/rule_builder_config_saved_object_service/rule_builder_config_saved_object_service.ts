/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsUtils } from '@kbn/core/server';
import { RULE_BUILDER_CONFIG_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { RuleBuilderConfigSavedObjectAttributes } from '../../../saved_objects';
import { RuleBuilderConfigSavedObjectsClientToken } from './tokens';

export interface RuleBuilderConfigSavedObjectServiceContract {
  create(params: { attrs: RuleBuilderConfigSavedObjectAttributes; id?: string }): Promise<string>;
  get(id: string): Promise<{ id: string; attributes: RuleBuilderConfigSavedObjectAttributes }>;
  update(params: { id: string; attrs: RuleBuilderConfigSavedObjectAttributes }): Promise<void>;
  delete(params: { id: string }): Promise<void>;
}

@injectable()
export class RuleBuilderConfigSavedObjectService
  implements RuleBuilderConfigSavedObjectServiceContract
{
  constructor(
    @inject(RuleBuilderConfigSavedObjectsClientToken)
    private readonly client: SavedObjectsClientContract
  ) {}

  public async create({
    attrs,
    id,
  }: {
    attrs: RuleBuilderConfigSavedObjectAttributes;
    id?: string;
  }): Promise<string> {
    const configId = id ?? SavedObjectsUtils.generateId();
    await this.client.create<RuleBuilderConfigSavedObjectAttributes>(
      RULE_BUILDER_CONFIG_SAVED_OBJECT_TYPE,
      attrs,
      {
        id: configId,
        overwrite: false,
      }
    );
    return configId;
  }

  public async get(
    id: string
  ): Promise<{ id: string; attributes: RuleBuilderConfigSavedObjectAttributes }> {
    const doc = await this.client.get<RuleBuilderConfigSavedObjectAttributes>(
      RULE_BUILDER_CONFIG_SAVED_OBJECT_TYPE,
      id
    );
    return { id: doc.id, attributes: doc.attributes };
  }

  public async update({
    id,
    attrs,
  }: {
    id: string;
    attrs: RuleBuilderConfigSavedObjectAttributes;
  }): Promise<void> {
    await this.client.update<RuleBuilderConfigSavedObjectAttributes>(
      RULE_BUILDER_CONFIG_SAVED_OBJECT_TYPE,
      id,
      attrs,
      { mergeAttributes: false }
    );
  }

  public async delete({ id }: { id: string }): Promise<void> {
    await this.client.delete(RULE_BUILDER_CONFIG_SAVED_OBJECT_TYPE, id);
  }
}
