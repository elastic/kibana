/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger, SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type {
  SavedObjectsClientContract,
  SavedObjectsUpdateResponse,
} from '@kbn/core-saved-objects-api-server';
import { executeEsqlQuery } from '../../../../infra/elasticsearch/esql';
import {
  getEsErrorReason,
  isEsResponseErrorWithStatus,
} from '../../../../infra/elasticsearch/es_errors';
import { resolveLatestEntitiesIndexName } from '../../../asset_manager/resolve_entity_store_indices';
import {
  CustomResolutionRuleNotFoundError,
  EntityStoreNotInstalledError,
  InvalidCustomResolutionRuleError,
  MissingEntityIndexPrivilegeError,
} from '../../../errors';
import type { EsqlExpressionMatchSpec } from '../rule_registry';
import { RAW_MATCH_VALUE_COLUMN, buildMatcherValidationQuery } from '../matcher';
import {
  CustomResolutionRuleTypeName,
  DEFAULT_DECLINE_SAME_NAMESPACE_DUPLICATES,
} from './constants';
import {
  canonicalDefinitionKey,
  toExpressionMatchSpec,
  type CustomResolutionRuleDefinition,
} from './match_spec';
import { previewCustomRule, type CustomRulePreview } from './preview';
import type { CustomResolutionRuleAttributes } from './saved_object';
import type {
  CustomResolutionRuleCreate,
  CustomResolutionRulePreviewRequest,
  CustomResolutionRuleUpdate,
} from './schemas';

const FIND_PAGE_SIZE = 100;

export interface CustomResolutionRule {
  id: string;
  name: string;
  namespaces: string[];
  filter?: string;
  match_value: string;
  decline_same_namespace_duplicates: boolean;
  enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

type CustomResolutionRuleFields = Omit<CustomResolutionRule, 'id' | 'created_at' | 'updated_at'>;

const toRule = ({
  id,
  attributes,
  created_at: createdAt,
  updated_at: updatedAt,
}: SavedObject<CustomResolutionRuleAttributes>): CustomResolutionRule => ({
  id,
  name: attributes.name,
  namespaces: attributes.entityNamespaces,
  ...(attributes.filter !== undefined && { filter: attributes.filter }),
  match_value: attributes.matchValue,
  decline_same_namespace_duplicates: attributes.declineSameNamespaceDuplicates,
  enabled: attributes.enabled,
  ...(createdAt && { created_at: createdAt }),
  ...(updatedAt && { updated_at: updatedAt }),
});

const toAttributes = (rule: CustomResolutionRuleFields): CustomResolutionRuleAttributes => ({
  name: rule.name,
  entityNamespaces: rule.namespaces,
  ...(rule.filter !== undefined && { filter: rule.filter }),
  matchValue: rule.match_value,
  declineSameNamespaceDuplicates: rule.decline_same_namespace_duplicates,
  enabled: rule.enabled,
});

const asInvalidRuleOnBadRequest = async <T>(query: () => Promise<T>): Promise<T> => {
  try {
    return await query();
  } catch (error) {
    if (isEsResponseErrorWithStatus(error, 400)) {
      throw new InvalidCustomResolutionRuleError(getEsErrorReason(error));
    }
    throw error;
  }
};

export const compareByCreation = (a: CustomResolutionRule, b: CustomResolutionRule): number =>
  (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.id.localeCompare(b.id);

export const findCustomResolutionRules = async (
  soClient: SavedObjectsClientContract
): Promise<CustomResolutionRule[]> => {
  const finder = soClient.createPointInTimeFinder<CustomResolutionRuleAttributes>({
    type: CustomResolutionRuleTypeName,
    perPage: FIND_PAGE_SIZE,
  });
  const rules: CustomResolutionRule[] = [];
  try {
    for await (const { saved_objects: savedObjects } of finder.find()) {
      rules.push(...savedObjects.map(toRule));
    }
  } finally {
    await finder.close();
  }
  return rules.sort(compareByCreation);
};

const findSavedObject = async (
  soClient: SavedObjectsClientContract,
  id: string
): Promise<SavedObject<CustomResolutionRuleAttributes> | undefined> => {
  try {
    return await soClient.get<CustomResolutionRuleAttributes>(CustomResolutionRuleTypeName, id);
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
};

/** One saved custom rule in the SO client's space, or undefined if it's gone. */
export const findCustomResolutionRule = async (
  soClient: SavedObjectsClientContract,
  id: string
): Promise<CustomResolutionRule | undefined> => {
  const savedObject = await findSavedObject(soClient, id);
  return savedObject && toRule(savedObject);
};

export class CustomResolutionRulesClient {
  constructor(
    private readonly deps: {
      soClient: SavedObjectsClientContract;
      esClient: ElasticsearchClient;
      spaceId: string;
      logger: Logger;
    }
  ) {}

  list(): Promise<CustomResolutionRule[]> {
    return findCustomResolutionRules(this.deps.soClient);
  }

  async get(id: string): Promise<CustomResolutionRule> {
    return toRule(await this.getSavedObject(id));
  }

  async create(input: CustomResolutionRuleCreate): Promise<CustomResolutionRule> {
    const rule: CustomResolutionRuleFields = {
      name: input.name,
      namespaces: input.namespaces,
      ...(input.filter !== undefined && { filter: input.filter }),
      match_value: input.match_value,
      decline_same_namespace_duplicates:
        input.decline_same_namespace_duplicates ?? DEFAULT_DECLINE_SAME_NAMESPACE_DUPLICATES,
      enabled: input.enabled ?? false,
    };
    const { index } = await this.validate(rule);
    if (rule.enabled) {
      await this.assertCanWriteLinks(index);
    }

    const created = await this.deps.soClient.create<CustomResolutionRuleAttributes>(
      CustomResolutionRuleTypeName,
      toAttributes(rule),
      { refresh: 'wait_for' }
    );
    this.deps.logger.info(
      `Created custom resolution rule '${created.id}' (enabled=${rule.enabled})`
    );
    return toRule(created);
  }

  /**
   * Partial update. Writes with the version it read, so a concurrent update
   * fails with a conflict instead of silently undoing the other write.
   */
  async update(id: string, patch: CustomResolutionRuleUpdate): Promise<CustomResolutionRule> {
    const savedObject = await this.getSavedObject(id);
    const current = toRule(savedObject);
    const nextFilter = patch.filter === null ? undefined : patch.filter ?? current.filter;
    const next: CustomResolutionRuleFields = {
      name: patch.name ?? current.name,
      namespaces: patch.namespaces ?? current.namespaces,
      ...(nextFilter !== undefined && { filter: nextFilter }),
      match_value: patch.match_value ?? current.match_value,
      decline_same_namespace_duplicates:
        patch.decline_same_namespace_duplicates ?? current.decline_same_namespace_duplicates,
      enabled: patch.enabled ?? current.enabled,
    };

    // Renaming or disabling must work even if the rule no longer validates.
    const definitionChanged = canonicalDefinitionKey(current) !== canonicalDefinitionKey(next);
    if (definitionChanged || (next.enabled && !current.enabled)) {
      const { index } = await this.validate(next);
      if (next.enabled) {
        await this.assertCanWriteLinks(index);
      }
    }

    let updated: SavedObjectsUpdateResponse<CustomResolutionRuleAttributes>;
    try {
      updated = await this.deps.soClient.update<CustomResolutionRuleAttributes>(
        CustomResolutionRuleTypeName,
        id,
        toAttributes(next),
        { refresh: 'wait_for', mergeAttributes: false, version: savedObject.version }
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        throw new CustomResolutionRuleNotFoundError(id);
      }
      throw error;
    }
    this.deps.logger.info(`Updated custom resolution rule '${id}' (enabled=${next.enabled})`);
    return {
      id,
      ...next,
      ...(current.created_at && { created_at: current.created_at }),
      ...(updated.updated_at && { updated_at: updated.updated_at }),
    };
  }

  async delete(id: string): Promise<void> {
    try {
      await this.deps.soClient.delete(CustomResolutionRuleTypeName, id, { refresh: 'wait_for' });
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        throw new CustomResolutionRuleNotFoundError(id);
      }
      throw error;
    }
    this.deps.logger.info(`Deleted custom resolution rule '${id}'`);
  }

  async preview(
    request: CustomResolutionRulePreviewRequest,
    signal?: AbortSignal
  ): Promise<CustomRulePreview> {
    const { spec, index } = await this.validate({
      ...request,
      decline_same_namespace_duplicates:
        request.decline_same_namespace_duplicates ?? DEFAULT_DECLINE_SAME_NAMESPACE_DUPLICATES,
    });
    return asInvalidRuleOnBadRequest(() =>
      previewCustomRule({ esClient: this.deps.esClient, index, spec, signal })
    );
  }

  private async getSavedObject(id: string): Promise<SavedObject<CustomResolutionRuleAttributes>> {
    const savedObject = await findSavedObject(this.deps.soClient, id);
    if (!savedObject) {
      throw new CustomResolutionRuleNotFoundError(id);
    }
    return savedObject;
  }

  /**
   * The maintainer applies an enabled rule's links with the entity store
   * owner's credentials, so whoever enables or changes one must be able to
   * write those links themselves.
   *
   * @throws MissingEntityIndexPrivilegeError
   */
  private async assertCanWriteLinks(index: string): Promise<void> {
    const { has_all_requested: canWrite } = await this.deps.esClient.security.hasPrivileges({
      index: [{ names: [index], privileges: ['write'] }],
    });
    if (!canWrite) {
      throw new MissingEntityIndexPrivilegeError(index, 'write');
    }
  }

  /**
   * @throws EntityStoreNotInstalledError
   * @throws MissingEntityIndexPrivilegeError
   */
  private async assertIndexExists(index: string): Promise<void> {
    let exists: boolean;
    try {
      exists = await this.deps.esClient.indices.exists({ index });
    } catch (error) {
      // A HEAD 403 has no body, so Elasticsearch's own message would be empty.
      if (isEsResponseErrorWithStatus(error, 403)) {
        throw new MissingEntityIndexPrivilegeError(index, 'view_index_metadata');
      }
      throw error;
    }
    if (!exists) {
      throw new EntityStoreNotInstalledError();
    }
  }

  /**
   * @throws InvalidCustomResolutionRuleError
   * @throws EntityStoreNotInstalledError
   * @throws MissingEntityIndexPrivilegeError
   */
  private async validate(
    definition: CustomResolutionRuleDefinition
  ): Promise<{ spec: EsqlExpressionMatchSpec; index: string }> {
    const spec = toExpressionMatchSpec(definition);
    const { esClient, spaceId } = this.deps;
    const index = await resolveLatestEntitiesIndexName(esClient, spaceId);
    await this.assertIndexExists(index);
    const { columns } = await asInvalidRuleOnBadRequest(() =>
      executeEsqlQuery({ esClient, query: buildMatcherValidationQuery({ index, spec }) })
    );
    if (columns.find(({ name }) => name === RAW_MATCH_VALUE_COLUMN)?.type === 'boolean') {
      throw new InvalidCustomResolutionRuleError(
        'must not be a boolean: every entity would share the key "true" or "false"',
        'match_value'
      );
    }
    return { spec, index };
  }
}
