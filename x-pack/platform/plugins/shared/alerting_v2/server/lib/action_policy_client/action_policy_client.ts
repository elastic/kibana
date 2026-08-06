/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import pMap from 'p-map';
import type {
  ActionPolicyResponse,
  BulkResponse,
  CreateActionPolicyDataInput,
  MatchedActionPolicy,
  MatcherContext,
} from '@kbn/alerting-v2-schemas';
import {
  createActionPolicyDataSchema,
  updateActionPolicyDataSchema,
} from '@kbn/alerting-v2-schemas';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder } from '@kbn/es-query';
import { evaluateKql } from '@kbn/eval-kql';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { treeifyError, type z } from '@kbn/zod/v4';
import { inject, injectable } from 'inversify';
import {
  ACTION_POLICY_SAVED_OBJECT_TYPE,
  type ActionPolicySavedObjectAttributes,
  type PartiallyUpdateableActionPolicyAttributes,
} from '../../saved_objects';
import { ALERTING_V2_ERROR_CODES, ALERTING_V2_LOG_CODES } from '../errors/error_codes';
import {
  getActionPolicyAlreadyExistsMessage,
  getActionPolicyNotFoundMessage,
  getActionPolicyVersionConflictMessage,
  getInvalidActionPolicyDataMessage,
} from '../errors/action_policy_error_messages';
import { EncryptedSavedObjectsClientToken } from '../dispatcher/steps/dispatch_step_tokens';
import { ActionPolicySavedObjectServiceScopedToken } from '../services/action_policy_saved_object_service/tokens';
import type { ActionPolicySavedObjectServiceContract } from '../services/action_policy_saved_object_service/types';
import type { ApiKeyServiceContract } from '../services/api_key_service/api_key_service';
import { ApiKeyService } from '../services/api_key_service/api_key_service';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { buildSoSearch } from '../build_so_search';
import type { RulesSavedObjectServiceContract } from '../services/rules_saved_object_service/rules_saved_object_service';
import { RulesSavedObjectServiceScopedToken } from '../services/rules_saved_object_service/tokens';
import type { UserServiceContract } from '../services/user_service/user_service';
import { UserService } from '../services/user_service/user_service';
import { ActionPolicyNamespaceToken } from './tokens';
import type {
  BulkActionPoliciesByIdsParams,
  BulkSnoozeActionPoliciesParams,
  CreateActionPolicyParams,
  FindActionPoliciesArgs,
  FindActionPoliciesResponse,
  MatchActionPoliciesForRuleParams,
  MatchActionPoliciesForRuleResponse,
  SnoozeActionPolicyParams,
  UpdateActionPolicyApiKeyParams,
  UpdateActionPolicyParams,
} from './types';
import {
  buildCreateActionPolicyAttributes,
  buildUpdateActionPolicyAttributes,
  toApiKeyAttributes,
  transformActionPolicySoAttributesToApiResponse,
  validateDateString,
} from './utils';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

/**
 * Concurrency cap for {@link ActionPolicyClient.bulkUpdateActionPoliciesApiKey}.
 * Unlike the other by-ID bulk endpoints, API-key rotation cannot be done in a
 * single SO round-trip — each id creates a fresh ES API key (plus a decrypt and
 * an SO write). Running them serially makes latency scale linearly with the
 * batch size, so we fan out; but a batch is capped at `MAX_BULK_ITEMS` (100) and
 * each item is heavy (ES `_security/api_key` create + crypto), so the peak load
 * is kept modest. 10 already gives a ~10x speedup over sequential while bounding
 * concurrent key creations and decrypts far more tightly than the batch cap.
 */
const MAX_API_KEY_UPDATES_IN_PARALLEL = 10;

/** A single per-resource error entry in a bulk response. */
type ActionPolicyBulkError = BulkResponse['errors'][number];

/** Decrypted API key material owned by an action policy. */
interface ActionPolicyAuth {
  apiKey: string;
  createdByUser: boolean;
}

/**
 * Maps a saved-object (or Boom) status code to the stable, machine-readable
 * bulk-error `code` returned in the response body. Keeps the bulk endpoints
 * aligned with the single-action-policy error codes so a client can dispatch
 * on `error.code` uniformly.
 */
const actionPolicyBulkErrorCodeForStatus = (statusCode: number): string => {
  if (statusCode === 404) {
    return ALERTING_V2_ERROR_CODES.ACTION_POLICY_NOT_FOUND;
  }
  if (statusCode === 409) {
    return ALERTING_V2_ERROR_CODES.ACTION_POLICY_VERSION_CONFLICT;
  }
  return ALERTING_V2_ERROR_CODES.INTERNAL_SERVER_ERROR;
};

const toActionPolicyBulkError = (
  id: string,
  err: { statusCode: number; message: string }
): ActionPolicyBulkError => ({
  id,
  error: { code: actionPolicyBulkErrorCodeForStatus(err.statusCode), message: err.message },
});

/**
 * Normalises a thrown error (Boom or otherwise) raised while processing a
 * single id inside a bulk loop into a per-resource bulk error entry.
 */
const bulkErrorFromThrown = (id: string, e: unknown): ActionPolicyBulkError => {
  const statusCode = Boom.isBoom(e) ? e.output.statusCode : 500;
  const message = e instanceof Error ? e.message : String(e);
  return toActionPolicyBulkError(id, { statusCode, message });
};

@injectable()
export class ActionPolicyClient {
  constructor(
    @inject(ActionPolicySavedObjectServiceScopedToken)
    private readonly actionPolicySavedObjectService: ActionPolicySavedObjectServiceContract,
    @inject(RulesSavedObjectServiceScopedToken)
    private readonly rulesSavedObjectService: RulesSavedObjectServiceContract,
    @inject(UserService) private readonly userService: UserServiceContract,
    @inject(ApiKeyService) private readonly apiKeyService: ApiKeyServiceContract,
    @inject(EncryptedSavedObjectsClientToken)
    private readonly esoClient: EncryptedSavedObjectsClient,
    @inject(ActionPolicyNamespaceToken)
    private readonly namespace: string | undefined,
    @inject(LoggerServiceToken)
    private readonly logger: LoggerServiceContract
  ) {}

  /**
   * Validates a request body with a Zod schema and produces a uniform
   * `Boom.badRequest` error message on failure. Centralised so every public
   * method (create / update / upsert) reports validation issues identically.
   */
  private parseActionPolicyData<T>(
    schema: z.ZodType<T>,
    data: unknown,
    context: 'create' | 'update' | 'upsert'
  ): T {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw Boom.badRequest(
        getInvalidActionPolicyDataMessage(context, stringifyZodError(parsed.error)),
        {
          code: ALERTING_V2_ERROR_CODES.INVALID_ACTION_POLICY_DATA,
          details: { context, errors: treeifyError(parsed.error) },
        }
      );
    }
    return parsed.data;
  }

  /**
   * Loads the existing action policy SO and translates `not found` into a
   * `Boom.notFound` error with the canonical message used everywhere else.
   * Other SO errors propagate so callers can map them as needed.
   */
  private async getExistingActionPolicy(
    id: string
  ): Promise<{ attrs: ActionPolicySavedObjectAttributes; version: string | undefined }> {
    try {
      const doc = await this.actionPolicySavedObjectService.get(id);
      return { attrs: doc.attributes, version: doc.version };
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(getActionPolicyNotFoundMessage(id), {
          code: ALERTING_V2_ERROR_CODES.ACTION_POLICY_NOT_FOUND,
          details: { action_policy_id: id },
        });
      }
      throw e;
    }
  }

  /**
   * Persists the next attributes for an existing action policy and translates
   * SO `version conflict` errors into a `Boom.conflict` with the canonical
   * "...has already been updated by another user" message. Callers that need
   * to do additional bookkeeping on conflict (e.g. invalidating a freshly
   * minted API key) should wrap this call in their own try/catch.
   */
  private async writeActionPolicyAttrs({
    id,
    attrs,
    version,
  }: {
    id: string;
    attrs: Partial<ActionPolicySavedObjectAttributes>;
    version?: string;
  }): Promise<{ id: string; version?: string }> {
    try {
      return await this.actionPolicySavedObjectService.update({ id, attrs, version });
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        throw Boom.conflict(getActionPolicyVersionConflictMessage(id), {
          code: ALERTING_V2_ERROR_CODES.ACTION_POLICY_VERSION_CONFLICT,
          details: { action_policy_id: id },
        });
      }
      throw e;
    }
  }

  public async createActionPolicy(params: CreateActionPolicyParams): Promise<ActionPolicyResponse> {
    const parsed = this.parseActionPolicyData(createActionPolicyDataSchema, params.data, 'create');

    const userProfileUid = await this.userService.getCurrentUserProfileUid();
    const now = new Date().toISOString();

    const apiKeyAttrs = await this.apiKeyService.create(`Action Policy: ${parsed.name}`);

    const attributes = buildCreateActionPolicyAttributes({
      data: parsed,
      auth: apiKeyAttrs,
      createdBy: userProfileUid,
      createdAt: now,
      updatedBy: userProfileUid,
      updatedAt: now,
    });

    try {
      const { id, version } = await this.actionPolicySavedObjectService.create({
        attrs: attributes,
        id: params.options?.id,
      });

      return transformActionPolicySoAttributesToApiResponse({
        id,
        version,
        attributes,
      });
    } catch (e) {
      this.markApiKeysForInvalidation(attributes.apiKey, false);
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        const conflictId = params.options?.id ?? 'unknown';
        throw Boom.conflict(getActionPolicyAlreadyExistsMessage(conflictId), {
          code: ALERTING_V2_ERROR_CODES.ACTION_POLICY_ALREADY_EXISTS,
          details: { action_policy_id: conflictId },
        });
      }
      throw e;
    }
  }

  public async getActionPolicy({ id }: { id: string }): Promise<ActionPolicyResponse> {
    const { attrs, version } = await this.getExistingActionPolicy(id);
    return transformActionPolicySoAttributesToApiResponse({
      id,
      version,
      attributes: attrs,
    });
  }

  public async actionPolicyExists({ id }: { id: string }): Promise<boolean> {
    try {
      await this.getExistingActionPolicy(id);
      return true;
    } catch (e) {
      if (Boom.isBoom(e) && e.output.statusCode === 404) {
        return false;
      }
      throw e;
    }
  }

  public async getActionPolicies({ ids }: { ids: string[] }): Promise<ActionPolicyResponse[]> {
    if (ids.length === 0) {
      return [];
    }

    const docs = await this.actionPolicySavedObjectService.bulkGetByIds(ids);

    return docs.flatMap((doc) => {
      if ('error' in doc) {
        return [];
      }

      return [
        transformActionPolicySoAttributesToApiResponse({
          id: doc.id,
          version: doc.version,
          attributes: doc.attributes,
        }),
      ];
    });
  }

  public async updateActionPolicy(params: UpdateActionPolicyParams): Promise<ActionPolicyResponse> {
    const parsed = this.parseActionPolicyData(updateActionPolicyDataSchema, params.data, 'update');

    const userProfileUid = await this.userService.getCurrentUserProfileUid();
    const now = new Date().toISOString();

    const { attrs: existingPolicy } = await this.getExistingActionPolicy(params.options.id);

    const oldAuth = await this.getDecryptedAuth(params.options.id);

    const policyName = parsed.name ?? existingPolicy.name;
    const apiKeyAttrs = await this.apiKeyService.create(`Action Policy: ${policyName}`);

    const nextAttrs = buildUpdateActionPolicyAttributes({
      existing: existingPolicy,
      update: parsed,
      auth: apiKeyAttrs,
      updatedBy: userProfileUid,
      updatedAt: now,
    });

    let updated: { id: string; version?: string };
    try {
      updated = await this.writeActionPolicyAttrs({
        id: params.options.id,
        attrs: nextAttrs,
        version: params.options.version,
      });
    } catch (e) {
      this.markApiKeysForInvalidation(apiKeyAttrs.apiKey, false);
      throw e;
    }

    this.markApiKeysForInvalidation(oldAuth?.apiKey, oldAuth?.createdByUser);

    return transformActionPolicySoAttributesToApiResponse({
      id: params.options.id,
      version: updated.version,
      attributes: nextAttrs,
    });
  }

  public async findActionPolicies(
    params: FindActionPoliciesArgs = {}
  ): Promise<FindActionPoliciesResponse> {
    const page = params.page ?? DEFAULT_PAGE;
    const perPage = params.perPage ?? DEFAULT_PER_PAGE;

    const filter = this.buildFindFilter(params);
    const sortField = this.mapSortField(params.sortField);

    const search = buildSoSearch(params.search);

    const res = await this.actionPolicySavedObjectService.find({
      page,
      perPage,
      search,
      filter,
      sortField,
      sortOrder: params.sortOrder,
    });

    return {
      items: res.saved_objects.map((so) =>
        transformActionPolicySoAttributesToApiResponse({
          id: so.id,
          version: so.version,
          attributes: so.attributes,
        })
      ),
      total: res.total,
      page,
      perPage,
    };
  }

  public async matchActionPoliciesForRule(
    params: MatchActionPoliciesForRuleParams
  ): Promise<MatchActionPoliciesForRuleResponse> {
    const { ruleId, ruleName, ruleTags } = params;

    let resolvedName = ruleName ?? '';
    let resolvedTags = ruleTags ?? [];

    // If ruleId is provided but not name or tags, fetch the rule from the DB to get the current name and tags
    if (ruleId && (ruleName === undefined || ruleTags === undefined)) {
      try {
        const rule = await this.rulesSavedObjectService.get(ruleId);
        resolvedName = ruleName ?? rule.attributes.metadata.name;
        resolvedTags = ruleTags ?? rule.attributes.metadata.tags ?? [];
      } catch (e) {
        if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
          return { items: [], total: 0 };
        }
        throw e;
      }
    }

    const context: MatcherContext = {
      last_event_timestamp: '',
      group_hash: '',
      episode_id: '',
      episode_status: 'active',
      rule: {
        id: ruleId ?? '',
        name: resolvedName,
        tags: resolvedTags,
      },
    };

    const items: MatchedActionPolicy[] = [];

    const allPolicies = await this.findActionPolicies({ perPage: 100 });
    for (const actionPolicy of allPolicies.items) {
      if (!actionPolicy.matcher || actionPolicy.matcher.trim() === '') {
        items.push({ actionPolicy, category: 'global' });
        continue;
      }

      let isMatch = false;
      try {
        isMatch = evaluateKql(actionPolicy.matcher, context);
      } catch (err) {
        this.logger.warn({
          message: () =>
            `Failed to evaluate KQL matcher for action policy "${
              actionPolicy.id
            }" during pre-matching: ${
              err instanceof Error ? err.message : String(err)
            }. Treating as no-match.`,
        });
        continue;
      }

      if (isMatch) {
        items.push({ actionPolicy, category: 'global-filtered' });
      }
    }

    return { items, total: allPolicies.total };
  }

  public async enableActionPolicy({ id }: { id: string }): Promise<ActionPolicyResponse> {
    return this.updatePolicyState(id, { enabled: true });
  }

  public async disableActionPolicy({ id }: { id: string }): Promise<ActionPolicyResponse> {
    return this.updatePolicyState(id, { enabled: false });
  }

  public async snoozeActionPolicy({
    id,
    snoozedUntil,
  }: SnoozeActionPolicyParams): Promise<ActionPolicyResponse> {
    return this.updatePolicyState(id, { snoozedUntil });
  }

  public async unsnoozeActionPolicy({ id }: { id: string }): Promise<ActionPolicyResponse> {
    return this.updatePolicyState(id, { snoozedUntil: null });
  }

  public async updateActionPolicyApiKey({ id }: UpdateActionPolicyApiKeyParams): Promise<void> {
    const { attrs: existingPolicy } = await this.getExistingActionPolicy(id);

    const oldAuth = await this.getDecryptedAuth(id);
    const userProfileUid = await this.userService.getCurrentUserProfileUid();
    const now = new Date().toISOString();
    const apiKeyAttrs = await this.apiKeyService.create(`Action Policy: ${existingPolicy.name}`);

    try {
      await this.writeActionPolicyAttrs({
        id,
        attrs: {
          ...toApiKeyAttributes(apiKeyAttrs),
          updatedBy: userProfileUid,
          updatedAt: now,
        },
      });
    } catch (e) {
      this.markApiKeysForInvalidation(apiKeyAttrs.apiKey, false);
      throw e;
    }

    this.markApiKeysForInvalidation(oldAuth?.apiKey, oldAuth?.createdByUser);
  }

  public async bulkEnableActionPolicies({
    ids,
  }: BulkActionPoliciesByIdsParams): Promise<BulkResponse> {
    return this.executeBulkUpdate(ids, { enabled: true });
  }

  public async bulkDisableActionPolicies({
    ids,
  }: BulkActionPoliciesByIdsParams): Promise<BulkResponse> {
    return this.executeBulkUpdate(ids, { enabled: false });
  }

  public async bulkSnoozeActionPolicies({
    ids,
    snoozedUntil,
  }: BulkSnoozeActionPoliciesParams): Promise<BulkResponse> {
    validateDateString(snoozedUntil);
    return this.executeBulkUpdate(ids, { snoozedUntil });
  }

  public async bulkUnsnoozeActionPolicies({
    ids,
  }: BulkActionPoliciesByIdsParams): Promise<BulkResponse> {
    return this.executeBulkUpdate(ids, { snoozedUntil: null });
  }

  /**
   * Deletes action policies by id, queueing their API keys for invalidation
   * *before* the saved objects that reference those keys are removed. See
   * {@link ActionPolicyClient.queueApiKeysForInvalidation} for why the phases
   * run in this order.
   *
   * A policy whose key cannot be queued is not deleted at all; it is
   * reported as `API_KEY_INVALIDATION_FAILED` so the caller can retry.
   */
  public async bulkDeleteActionPolicies({
    ids,
  }: BulkActionPoliciesByIdsParams): Promise<BulkResponse> {
    if (ids.length === 0) {
      return { affected_count: 0, errors: [] };
    }

    const authMap = await this.getBulkDecryptedAuth(ids);

    const { invalidatedIds, errors: invalidationErrors } = await this.queueApiKeysForInvalidation(
      ids.map((id) => ({ id, auth: authMap.get(id) ?? null }))
    );

    const errors: ActionPolicyBulkError[] = [...invalidationErrors];
    const blockedIds = new Set(invalidationErrors.map(({ id }) => id));

    const idsToDelete = ids.filter((id) => !blockedIds.has(id));
    const deleteResults =
      idsToDelete.length > 0
        ? await this.actionPolicySavedObjectService.bulkDelete({ ids: idsToDelete })
        : [];

    let affectedCount = 0;
    const divergedIds: string[] = [];

    for (const result of deleteResults) {
      if ('error' in result) {
        errors.push(toActionPolicyBulkError(result.id, result.error));
        if (invalidatedIds.has(result.id)) {
          divergedIds.push(result.id);
        }
        continue;
      }
      affectedCount += 1;
    }

    if (divergedIds.length > 0) {
      this.logDivergedApiKeyInvalidation(divergedIds);
    }

    return { affected_count: affectedCount, errors };
  }

  public async bulkUpdateActionPoliciesApiKey({
    ids,
  }: BulkActionPoliciesByIdsParams): Promise<BulkResponse> {
    // Each id rotates its own API key (SO get + decrypt + key create + write),
    // so the work is per-item rather than a single SO round-trip. Fan out with a
    // bounded concurrency; failures are isolated per id inside the mapper so one
    // bad policy never aborts the rest of the batch. `pMap` preserves input
    // order, keeping the `errors` ordering deterministic.
    const results = await pMap(
      ids,
      async (id): Promise<ActionPolicyBulkError | null> => {
        try {
          await this.updateActionPolicyApiKey({ id });
          return null;
        } catch (e) {
          return bulkErrorFromThrown(id, e);
        }
      },
      { concurrency: MAX_API_KEY_UPDATES_IN_PARALLEL }
    );

    const errors = results.filter((result): result is ActionPolicyBulkError => result !== null);

    return { affected_count: ids.length - errors.length, errors };
  }

  /**
   * Shared executor for the state-mutating by-ID bulk endpoints (enable /
   * disable / snooze / unsnooze). Applies the same `stateUpdate` to every
   * targeted policy in a single SO `bulkUpdate`, stamps audit metadata, and
   * maps per-object SO failures to the canonical bulk-error shape.
   */
  private async executeBulkUpdate(
    ids: string[],
    stateUpdate: PartiallyUpdateableActionPolicyAttributes
  ): Promise<BulkResponse> {
    if (ids.length === 0) {
      return { affected_count: 0, errors: [] };
    }

    const userProfileUid = await this.userService.getCurrentUserProfileUid();
    const now = new Date().toISOString();

    const objects = ids.map((id) => ({
      id,
      attrs: {
        ...stateUpdate,
        updatedBy: userProfileUid,
        updatedAt: now,
      },
    }));

    const updateResults = await this.actionPolicySavedObjectService.bulkUpdate({ objects });

    const errors: ActionPolicyBulkError[] = [];
    let affectedCount = 0;

    for (const result of updateResults) {
      if ('error' in result) {
        errors.push(toActionPolicyBulkError(result.id, result.error));
        continue;
      }
      affectedCount += 1;
    }

    return { affected_count: affectedCount, errors };
  }

  private buildFindFilter(params: FindActionPoliciesArgs): KueryNode | undefined {
    const conditions: KueryNode[] = [];
    const attrPrefix = `${ACTION_POLICY_SAVED_OBJECT_TYPE}.attributes`;

    if (params.enabled !== undefined) {
      conditions.push(nodeBuilder.is(`${attrPrefix}.enabled`, params.enabled ? 'true' : 'false'));
    }

    if (params.tags && params.tags.length > 0) {
      const tagConditions = params.tags.map((tag) => nodeBuilder.is(`${attrPrefix}.tags`, tag));
      conditions.push(
        tagConditions.length === 1 ? tagConditions[0] : nodeBuilder.or(tagConditions)
      );
    }

    if (conditions.length === 0) {
      return undefined;
    }

    return conditions.length === 1 ? conditions[0] : nodeBuilder.and(conditions);
  }

  private mapSortField(sortField?: string): string | undefined {
    if (!sortField) {
      return undefined;
    }

    const sortFieldMap: Record<string, string> = {
      name: 'name.keyword',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    };

    return sortFieldMap[sortField];
  }

  public async getAllTags(params?: { search?: string }): Promise<string[]> {
    return this.actionPolicySavedObjectService.getDistinctTags({
      search: params?.search,
    });
  }

  /**
   * Deletes a single action policy, queueing its API key for invalidation
   * before the saved object that references the key is removed. In case of
   * failure, the delete is abandoned rather than orphaning a live credential.
   */
  public async deleteActionPolicy({ id }: { id: string }): Promise<void> {
    if (!(await this.actionPolicyExists({ id }))) {
      throw Boom.notFound(getActionPolicyNotFoundMessage(id), {
        code: ALERTING_V2_ERROR_CODES.ACTION_POLICY_NOT_FOUND,
        details: { action_policy_id: id },
      });
    }

    const auth = await this.getDecryptedAuth(id);
    const { invalidatedIds, errors } = await this.queueApiKeysForInvalidation([{ id, auth }]);

    const [invalidationError] = errors;
    if (invalidationError) {
      throw Boom.internal(invalidationError.error.message, {
        code: invalidationError.error.code,
        details: { action_policy_id: id },
      });
    }

    try {
      await this.actionPolicySavedObjectService.delete({ id });
    } catch (e) {
      if (invalidatedIds.has(id)) {
        this.logDivergedApiKeyInvalidation([id]);
      }
      throw e;
    }
  }

  /**
   * Queues the Kibana-owned API keys of the targeted policies for invalidation
   * and reports which policies must therefore not be deleted. Shared by both
   * delete paths so they order the phases and word their failures identically.
   *
   * `invalidatedIds` carries the policies whose key is now queued, so a caller
   * whose delete then fails can report the divergence.
   */
  private async queueApiKeysForInvalidation(
    targets: Array<{ id: string; auth: ActionPolicyAuth | null }>
  ): Promise<{ invalidatedIds: Set<string>; errors: ActionPolicyBulkError[] }> {
    const queueable = targets.flatMap(({ id, auth }) =>
      auth && !auth.createdByUser ? [{ id, apiKey: auth.apiKey }] : []
    );

    if (queueable.length === 0) {
      return { invalidatedIds: new Set(), errors: [] };
    }

    const results = await this.apiKeyService.markApiKeysForInvalidation(
      queueable.map(({ apiKey }) => apiKey)
    );

    const invalidatedIds = new Set<string>();
    const errors: ActionPolicyBulkError[] = [];

    queueable.forEach(({ id }, index) => {
      const result = results[index];
      if (result?.success) {
        invalidatedIds.add(id);
        return;
      }

      errors.push({
        id,
        error: {
          code: ALERTING_V2_ERROR_CODES.API_KEY_INVALIDATION_FAILED,
          message: `Action policy with id "${id}" was not deleted because its API key could not be queued for invalidation${
            result ? `: ${result.message}` : ''
          }`,
        },
      });
    });

    if (errors.length > 0) {
      this.logger.error({
        error: new Error(
          `Skipped deleting action policy(ies) [${errors
            .map(({ id }) => id)
            .join(
              ', '
            )}]; their API keys could not be queued for invalidation, and deleting them would leave the keys valid with nothing referencing them`
        ),
        code: ALERTING_V2_LOG_CODES.ACTION_POLICY_DELETE_BLOCKED_BY_API_KEY_INVALIDATION,
      });
    }

    return { invalidatedIds, errors };
  }

  /**
   * Records action policies whose API keys were queued for invalidation but
   * whose deletion then failed — they survive with keys that are about to stop
   * working, so they need a key rotation to keep dispatching.
   */
  private logDivergedApiKeyInvalidation(ids: string[]): void {
    this.logger.error({
      error: new Error(
        `Queued API key(s) for action policy(ies) [${ids.join(
          ', '
        )}] for invalidation but failed to delete them; the policies remain with keys that are about to be invalidated and must be rotated to keep dispatching`
      ),
      code: ALERTING_V2_LOG_CODES.ACTION_POLICY_API_KEY_INVALIDATION_DIVERGED,
    });
  }

  private markApiKeysForInvalidation(apiKey?: string, createdByUser?: boolean): void {
    if (!apiKey || createdByUser) {
      return;
    }

    this.apiKeyService.markApiKeysForInvalidation([apiKey]).catch(() => {});
  }

  private async getDecryptedAuth(id: string): Promise<ActionPolicyAuth | null> {
    try {
      const doc =
        await this.esoClient.getDecryptedAsInternalUser<ActionPolicySavedObjectAttributes>(
          ACTION_POLICY_SAVED_OBJECT_TYPE,
          id,
          this.namespace ? { namespace: this.namespace } : undefined
        );
      const { apiKey, apiKeyCreatedByUser } = doc.attributes ?? {};
      if (!apiKey) return null;

      return {
        apiKey,
        createdByUser: apiKeyCreatedByUser ?? false,
      };
    } catch (e) {
      this.logger.debug({
        message: () =>
          `Failed to decrypt auth for action policy "${id}": ${
            e instanceof Error ? e.message : String(e)
          }`,
      });
      return null;
    }
  }

  private async getBulkDecryptedAuth(ids: string[]): Promise<Map<string, ActionPolicyAuth>> {
    const targetIds = new Set(ids);
    const authMap = new Map<string, ActionPolicyAuth>();

    try {
      const finder =
        await this.esoClient.createPointInTimeFinderDecryptedAsInternalUser<ActionPolicySavedObjectAttributes>(
          {
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            perPage: Math.min(ids.length, 1000),
            ...(this.namespace ? { namespaces: [this.namespace] } : {}),
          }
        );

      for await (const response of finder.find()) {
        for (const so of response.saved_objects) {
          if (targetIds.has(so.id) && so.attributes.apiKey) {
            authMap.set(so.id, {
              apiKey: so.attributes.apiKey,
              createdByUser: so.attributes.apiKeyCreatedByUser ?? false,
            });
          }
        }
        if (authMap.size >= targetIds.size) {
          finder.close().catch(() => {});
          break;
        }
      }
    } catch {
      // best-effort — same as getDecryptedAuth returning null on failure
    }

    return authMap;
  }

  private async updatePolicyState(
    id: string,
    stateUpdate: PartiallyUpdateableActionPolicyAttributes
  ): Promise<ActionPolicyResponse> {
    if (stateUpdate.snoozedUntil) {
      validateDateString(stateUpdate.snoozedUntil);
    }

    const userProfileUid = await this.userService.getCurrentUserProfileUid();
    const now = new Date().toISOString();

    try {
      await this.writeActionPolicyAttrs({
        id,
        attrs: {
          ...stateUpdate,
          updatedBy: userProfileUid,
          updatedAt: now,
        },
      });
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(getActionPolicyNotFoundMessage(id), {
          code: ALERTING_V2_ERROR_CODES.ACTION_POLICY_NOT_FOUND,
          details: { action_policy_id: id },
        });
      }
      throw e;
    }

    return this.getActionPolicy({ id });
  }

  public async upsertActionPolicy({
    id,
    data,
  }: {
    id: string;
    data: CreateActionPolicyDataInput;
  }): Promise<{ policy: ActionPolicyResponse; created: boolean }> {
    // Validate up front so a bad body never spends an API key allocation or
    // even consults the SO store.
    const parsed = this.parseActionPolicyData(createActionPolicyDataSchema, data, 'upsert');

    const exists = await this.actionPolicyExists({ id });

    if (!exists) {
      const policy = await this.createActionPolicy({ data, options: { id } });
      return { policy, created: true };
    }

    const userProfileUid = await this.userService.getCurrentUserProfileUid();
    const now = new Date().toISOString();

    const { attrs: existingAttrs, version: existingVersion } = await this.getExistingActionPolicy(
      id
    );

    // The API key is rotated on every replace; the old key is invalidated
    // only after the SO write succeeds, so a failed replace doesn't leave
    // the policy with a key that has already been invalidated.
    const oldAuth = await this.getDecryptedAuth(id);
    const apiKeyAttrs = await this.apiKeyService.create(`Action Policy: ${parsed.name}`);

    // PUT replaces every field accepted by createActionPolicyDataSchema. Audit
    // metadata (createdBy/createdAt) and operational state (enabled,
    // snoozedUntil) are not part of the create schema and are preserved here.
    const replacementAttrs: ActionPolicySavedObjectAttributes = {
      ...buildCreateActionPolicyAttributes({
        data: parsed,
        auth: apiKeyAttrs,
        createdBy: existingAttrs.createdBy,
        createdAt: existingAttrs.createdAt,
        updatedBy: userProfileUid,
        updatedAt: now,
      }),
      enabled: existingAttrs.enabled,
      snoozedUntil: existingAttrs.snoozedUntil,
    };

    let updated: { id: string; version?: string };
    try {
      updated = await this.writeActionPolicyAttrs({
        id,
        attrs: replacementAttrs,
        version: existingVersion,
      });
    } catch (e) {
      this.markApiKeysForInvalidation(apiKeyAttrs.apiKey, false);
      throw e;
    }

    this.markApiKeysForInvalidation(oldAuth?.apiKey, oldAuth?.createdByUser);

    return {
      policy: transformActionPolicySoAttributesToApiResponse({
        id,
        version: updated.version,
        attributes: replacementAttrs,
      }),
      created: false,
    };
  }
}
