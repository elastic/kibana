/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { SavedObjectsErrorHelpers, type Logger } from '@kbn/core/server';
import type { ResolutionRuleId } from '../../../../common';
import { EntityResolutionRuleTypeName } from './saved_object';
import { EntityResolutionRuleAttributes } from './saved_object';
import {
  RESOLUTION_RULE_CONFIGS,
  getResolutionRuleConfig,
  type ResolutionRuleConfig,
} from './rule_registry';

export interface EffectiveResolutionRule {
  id: ResolutionRuleConfig['id'];
  kind: ResolutionRuleConfig['kind'];
  managed: true;
  enabled: boolean;
}

export class ResolutionRulesClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    // This is the Kibana space / Entity Store index namespace, not entity.namespace
    // (active_directory, okta, etc.). The SO client is already scoped to the
    // current space, so this value is only used for deterministic per-space IDs.
    private readonly namespace: string,
    private readonly logger: Logger
  ) {}

  async getEffectiveRules(): Promise<EffectiveResolutionRule[]> {
    const overrides = await this.getOverrides();
    return RESOLUTION_RULE_CONFIGS.map((config) =>
      this.toEffectiveRule(config, overrides.get(config.id)?.enabled)
    );
  }

  async isEnabled(id: ResolutionRuleId): Promise<boolean> {
    const config = getResolutionRuleConfig(id);
    if (!config) {
      return false;
    }

    const override = await this.getOverride(id);
    return override?.enabled ?? config.defaultEnabled;
  }

  async setEnabled(id: ResolutionRuleId, enabled: boolean): Promise<EffectiveResolutionRule> {
    const config = getResolutionRuleConfig(id);
    if (!config) {
      throw SavedObjectsErrorHelpers.createGenericNotFoundError(`Unknown resolution rule: ${id}`);
    }

    const attributes: EntityResolutionRuleAttributes = {
      id,
      kind: config.kind,
      managed: true,
      enabled,
    };

    const savedObjectId = this.getSavedObjectId(id);
    try {
      await this.soClient.create<EntityResolutionRuleAttributes>(
        EntityResolutionRuleTypeName,
        attributes,
        {
          id: savedObjectId,
          refresh: 'wait_for',
        }
      );
    } catch (error) {
      if (!SavedObjectsErrorHelpers.isConflictError(error)) {
        throw error;
      }

      await this.soClient.update<EntityResolutionRuleAttributes>(
        EntityResolutionRuleTypeName,
        savedObjectId,
        attributes,
        {
          refresh: 'wait_for',
          mergeAttributes: true,
        }
      );
    }

    this.logger.debug(`Set entity resolution rule '${id}' enabled=${enabled}`);
    return this.toEffectiveRule(config, enabled);
  }

  private async getOverrides(): Promise<Map<ResolutionRuleId, EntityResolutionRuleAttributes>> {
    const response = await this.soClient.find<EntityResolutionRuleAttributes>({
      type: EntityResolutionRuleTypeName,
      perPage: RESOLUTION_RULE_CONFIGS.length,
    });

    return new Map(
      response.saved_objects.map((savedObject) => [
        savedObject.attributes.id,
        EntityResolutionRuleAttributes.parse(savedObject.attributes),
      ])
    );
  }

  private async getOverride(
    id: ResolutionRuleId
  ): Promise<EntityResolutionRuleAttributes | undefined> {
    try {
      const { attributes } = await this.soClient.get<EntityResolutionRuleAttributes>(
        EntityResolutionRuleTypeName,
        this.getSavedObjectId(id)
      );
      return EntityResolutionRuleAttributes.parse(attributes);
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        return undefined;
      }
      throw error;
    }
  }

  private toEffectiveRule(
    config: ResolutionRuleConfig,
    enabledOverride: boolean | undefined
  ): EffectiveResolutionRule {
    return {
      id: config.id,
      kind: config.kind,
      managed: true,
      enabled: enabledOverride ?? config.defaultEnabled,
    };
  }

  private getSavedObjectId(id: ResolutionRuleId): string {
    return `${EntityResolutionRuleTypeName}-${id}-${this.namespace}`;
  }
}
