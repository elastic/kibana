/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger, SavedObject } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { executeEsqlQuery } from '../../../../infra/elasticsearch/esql';
import { resolveLatestEntitiesIndexName } from '../../../asset_manager/resolve_entity_store_indices';
import {
  CustomResolutionRuleForbiddenError,
  CustomResolutionRuleNotFoundError,
  EntityStoreNotInstalledError,
  InvalidCustomResolutionRuleError,
} from '../../../errors';
import type { EsqlExpressionMatchSpec } from '../rule_registry';
import { buildMatcherValidationQuery } from '../matcher';
import { MAX_CUSTOM_RULES_PER_SPACE } from './constants';
import {
  canonicalDefinitionKey,
  toExpressionMatchSpec,
  type CustomResolutionRuleDefinition,
} from './match_spec';
import { previewCustomRule, type CustomRulePreview } from './preview';
import { CustomResolutionRuleTypeName, type CustomResolutionRuleAttributes } from './saved_object';
import type {
  CustomResolutionRuleCreate,
  CustomResolutionRulePreviewRequest,
  CustomResolutionRuleUpdate,
} from './schemas';

// Above the per-space cap, so a rule created in a race is still found.
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

export const toRuleDefinition = (
  rule: Pick<
    CustomResolutionRule,
    'namespaces' | 'filter' | 'match_value' | 'decline_same_namespace_duplicates'
  >
): CustomResolutionRuleDefinition => ({
  namespaces: rule.namespaces,
  ...(rule.filter !== undefined && { filter: rule.filter }),
  matchValue: rule.match_value,
  declineSameNamespaceDuplicates: rule.decline_same_namespace_duplicates,
});

/** Saved custom rules in the SO client's space, oldest first. */
export const findCustomResolutionRules = async (
  soClient: SavedObjectsClientContract
): Promise<CustomResolutionRule[]> => {
  const { saved_objects: savedObjects } = await soClient.find<CustomResolutionRuleAttributes>({
    type: CustomResolutionRuleTypeName,
    perPage: FIND_PAGE_SIZE,
  });
  return savedObjects
    .map(toRule)
    .sort(
      (a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.id.localeCompare(b.id)
    );
};

/** One saved custom rule in the SO client's space, or undefined if it's gone. */
export const findCustomResolutionRule = async (
  soClient: SavedObjectsClientContract,
  id: string
): Promise<CustomResolutionRule | undefined> => {
  try {
    return toRule(
      await soClient.get<CustomResolutionRuleAttributes>(CustomResolutionRuleTypeName, id)
    );
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
      return undefined;
    }
    throw error;
  }
};

const isEsBadRequest = (error: unknown): error is esErrors.ResponseError =>
  error instanceof esErrors.ResponseError && error.statusCode === 400;

const esReason = (error: esErrors.ResponseError): string => {
  const reason = (error.body as { error?: { reason?: unknown } } | undefined)?.error?.reason;
  return typeof reason === 'string' ? reason : error.message;
};

export class CustomResolutionRulesClient {
  constructor(
    private readonly deps: {
      soClient: SavedObjectsClientContract;
      esClient: ElasticsearchClient;
      // Kibana space / Entity Store index namespace, not entity.namespace.
      namespace: string;
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
      decline_same_namespace_duplicates: input.decline_same_namespace_duplicates ?? true,
      enabled: input.enabled ?? false,
    };
    const { index } = await this.validate(toRuleDefinition(rule));
    if (rule.enabled) {
      await this.assertCanWriteLinks(index);
    }

    const existing = await this.list();
    if (existing.length >= MAX_CUSTOM_RULES_PER_SPACE) {
      throw new InvalidCustomResolutionRuleError(
        `a space can hold at most ${MAX_CUSTOM_RULES_PER_SPACE} custom rules`
      );
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

    // Renaming or disabling must work even if the rule no longer validates (a
    // field it reads was removed). A changed definition, or turning the rule
    // on, is checked.
    const nextDefinition = toRuleDefinition(next);
    const definitionChanged =
      canonicalDefinitionKey(toRuleDefinition(current)) !== canonicalDefinitionKey(nextDefinition);
    if (definitionChanged || (next.enabled && !current.enabled)) {
      const { index } = await this.validate(nextDefinition);
      if (next.enabled) {
        await this.assertCanWriteLinks(index);
      }
    }

    const updated = await this.deps.soClient.update<CustomResolutionRuleAttributes>(
      CustomResolutionRuleTypeName,
      id,
      toAttributes(next),
      { refresh: 'wait_for', mergeAttributes: false, version: savedObject.version }
    );
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
    const definition = toRuleDefinition({
      ...request,
      decline_same_namespace_duplicates: request.decline_same_namespace_duplicates ?? true,
    });
    const { spec, index } = await this.validate(definition);
    return previewCustomRule({ esClient: this.deps.esClient, index, spec, signal });
  }

  private async getSavedObject(id: string): Promise<SavedObject<CustomResolutionRuleAttributes>> {
    try {
      return await this.deps.soClient.get<CustomResolutionRuleAttributes>(
        CustomResolutionRuleTypeName,
        id
      );
    } catch (error) {
      if (SavedObjectsErrorHelpers.isNotFoundError(error)) {
        throw new CustomResolutionRuleNotFoundError(id);
      }
      throw error;
    }
  }

  /**
   * The maintainer applies an enabled rule's links with the entity store
   * owner's credentials, so whoever enables or changes one must be able to
   * write those links themselves, as with the link API.
   *
   * @throws CustomResolutionRuleForbiddenError
   */
  private async assertCanWriteLinks(index: string): Promise<void> {
    const { has_all_requested: canWrite } = await this.deps.esClient.security.hasPrivileges({
      index: [{ names: [index], privileges: ['write'] }],
    });
    if (!canWrite) {
      throw new CustomResolutionRuleForbiddenError(index);
    }
  }

  /**
   * @throws InvalidCustomResolutionRuleError
   * @throws EntityStoreNotInstalledError
   */
  private async validate(
    definition: CustomResolutionRuleDefinition
  ): Promise<{ spec: EsqlExpressionMatchSpec; index: string }> {
    const spec = toExpressionMatchSpec(definition);
    const { esClient, namespace } = this.deps;
    const index = await resolveLatestEntitiesIndexName(esClient, namespace);
    if (!(await esClient.indices.exists({ index }))) {
      throw new EntityStoreNotInstalledError();
    }
    try {
      await executeEsqlQuery({ esClient, query: buildMatcherValidationQuery({ index, spec }) });
    } catch (error) {
      if (isEsBadRequest(error)) {
        throw new InvalidCustomResolutionRuleError(esReason(error));
      }
      throw error;
    }
    return { spec, index };
  }
}
