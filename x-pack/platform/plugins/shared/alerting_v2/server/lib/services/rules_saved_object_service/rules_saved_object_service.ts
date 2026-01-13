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
import { RULE_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { RuleSavedObjectAttributes } from '../../../saved_objects';
import type { AlertingServerStartDependencies } from '../../../types';
import { spaceIdToNamespace } from '../../space_id_to_namespace';

@injectable()
export class RulesSavedObjectService {
  constructor(
    @inject(SavedObjectsClientFactory)
    private readonly savedObjectsClientFactory: ISavedObjectsClientFactory,
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart
  ) {}

  public async getRuleAttributes({
    id,
    spaceId,
  }: {
    id: string;
    spaceId?: string;
  }): Promise<RuleSavedObjectAttributes> {
    const namespace = spaceIdToNamespace(this.spaces, spaceId);
    const client = this.savedObjectsClientFactory({
      includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
    });
    const doc = await client.get<RuleSavedObjectAttributes>(RULE_SAVED_OBJECT_TYPE, id, {
      namespace,
    });
    return doc.attributes;
  }
}
