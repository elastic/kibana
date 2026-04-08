/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type {
  NotificationPolicyBulkAction,
  NotificationPolicyResponse,
} from '@kbn/alerting-v2-schemas';
import {
  createNotificationPolicyDataSchema,
  updateNotificationPolicyDataSchema,
} from '@kbn/alerting-v2-schemas';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder } from '@kbn/es-query';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { inject, injectable } from 'inversify';
import { partition } from 'lodash';
import {
  NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
  type NotificationPolicySavedObjectAttributes,
} from '../../saved_objects';
import { EncryptedSavedObjectsClientToken } from '../dispatcher/steps/dispatch_step_tokens';
import type { ApiKeyServiceContract } from '../services/api_key_service/api_key_service';
import { ApiKeyService } from '../services/api_key_service/api_key_service';
import type { NotificationPolicySavedObjectServiceContract } from '../services/notification_policy_saved_object_service/types';
import { NotificationPolicySavedObjectServiceScopedToken } from '../services/notification_policy_saved_object_service/tokens';
import type { UserServiceContract } from '../services/user_service/user_service';
import { UserService } from '../services/user_service/user_service';
import { NotificationPolicyNamespaceToken } from './tokens';
import type {
  BulkActionNotificationPoliciesParams,
  BulkActionNotificationPoliciesResponse,
  CreateNotificationPolicyParams,
  FindNotificationPoliciesParams,
  FindNotificationPoliciesResponse,
  SnoozeNotificationPolicyParams,
  UpdateNotificationPolicyApiKeyParams,
  UpdateNotificationPolicyParams,
} from './types';
import {
  buildCreateNotificationPolicyAttributes,
  buildUpdateNotificationPolicyAttributes,
  transformNotificationPolicySoAttributesToApiResponse,
  validateDateString,
} from './utils';

const resolveActionAttrs = (
  action: Exclude<NotificationPolicyBulkAction, { action: 'delete' } | { action: 'update_api_key' }>
): Partial<NotificationPolicySavedObjectAttributes> => {
  switch (action.action) {
    case 'enable':
      return { enabled: true };
    case 'disable':
      return { enabled: false };
    case 'snooze':
      return { snoozedUntil: action.snoozedUntil };
    case 'unsnooze':
      return { snoozedUntil: null };
  }
};

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 20;

@injectable()
export class NotificationPolicyClient {
  constructor(
    @inject(NotificationPolicySavedObjectServiceScopedToken)
    private readonly notificationPolicySavedObjectService: NotificationPolicySavedObjectServiceContract,
    @inject(UserService) private readonly userService: UserServiceContract,
    @inject(ApiKeyService) private readonly apiKeyService: ApiKeyServiceContract,
    @inject(EncryptedSavedObjectsClientToken)
    private readonly esoClient: EncryptedSavedObjectsClient,
    @inject(NotificationPolicyNamespaceToken)
    private readonly namespace: string | undefined
  ) {}

  public async createNotificationPolicy(
    params: CreateNotificationPolicyParams
  ): Promise<NotificationPolicyResponse> {
    const parsed = createNotificationPolicyDataSchema.safeParse(params.data);
    if (!parsed.success) {
      throw Boom.badRequest(
        `Error validating create notification policy data - ${stringifyZodError(parsed.error)}`
      );
    }

    const userProfile = await this.getUserProfile();
    const now = new Date().toISOString();

    const apiKeyAttrs = await this.apiKeyService.create(`Notification Policy: ${params.data.name}`);

    const attributes = buildCreateNotificationPolicyAttributes({
      data: parsed.data,
      auth: apiKeyAttrs,
      createdBy: userProfile.uid,
      createdByUsername: userProfile.username,
      createdAt: now,
      updatedBy: userProfile.uid,
      updatedByUsername: userProfile.username,
      updatedAt: now,
    });

    try {
      const { id, version } = await this.notificationPolicySavedObjectService.create({
        attrs: attributes,
        id: params.options?.id,
      });

      return transformNotificationPolicySoAttributesToApiResponse({
        id,
        version,
        attributes,
      });
    } catch (e) {
      this.markApiKeysForInvalidation(attributes.auth?.apiKey, false);
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        const conflictId = params.options?.id ?? 'unknown';
        throw Boom.conflict(`Notification policy with id "${conflictId}" already exists`);
      }
      throw e;
    }
  }

  public async getNotificationPolicy({ id }: { id: string }): Promise<NotificationPolicyResponse> {
    try {
      const doc = await this.notificationPolicySavedObjectService.get(id);
      return transformNotificationPolicySoAttributesToApiResponse({
        id,
        version: doc.version,
        attributes: doc.attributes,
      });
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(`Notification policy with id "${id}" not found`);
      }
      throw e;
    }
  }

  public async getNotificationPolicies({
    ids,
  }: {
    ids: string[];
  }): Promise<NotificationPolicyResponse[]> {
    if (ids.length === 0) {
      return [];
    }

    const docs = await this.notificationPolicySavedObjectService.bulkGetByIds(ids);

    return docs.flatMap((doc) => {
      if ('error' in doc) {
        return [];
      }

      return [
        transformNotificationPolicySoAttributesToApiResponse({
          id: doc.id,
          version: doc.version,
          attributes: doc.attributes,
        }),
      ];
    });
  }

  public async updateNotificationPolicy(
    params: UpdateNotificationPolicyParams
  ): Promise<NotificationPolicyResponse> {
    const parsed = updateNotificationPolicyDataSchema.safeParse(params.data);
    if (!parsed.success) {
      throw Boom.badRequest(
        `Error validating update notification policy data - ${stringifyZodError(parsed.error)}`
      );
    }

    const userProfile = await this.getUserProfile();
    const now = new Date().toISOString();

    let existingPolicy: NotificationPolicySavedObjectAttributes;
    try {
      const doc = await this.notificationPolicySavedObjectService.get(params.options.id);
      existingPolicy = doc.attributes;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(`Notification policy with id "${params.options.id}" not found`);
      }
      throw e;
    }

    const oldAuth = await this.getDecryptedAuth(params.options.id);

    const policyName = parsed.data.name ?? existingPolicy.name;
    const apiKeyAttrs = await this.apiKeyService.create(`Notification Policy: ${policyName}`);

    const nextAttrs = buildUpdateNotificationPolicyAttributes({
      existing: existingPolicy,
      update: parsed.data,
      auth: apiKeyAttrs,
      updatedBy: userProfile.uid,
      updatedByUsername: userProfile.username,
      updatedAt: now,
    });

    let updated: { id: string; version?: string };
    try {
      updated = await this.notificationPolicySavedObjectService.update({
        id: params.options.id,
        attrs: nextAttrs,
        version: params.options.version,
      });
    } catch (e) {
      // If update fails we explicitly mark the new API key for invalidation
      this.markApiKeysForInvalidation(apiKeyAttrs.apiKey, false);
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        throw Boom.conflict(
          `Notification policy with id "${params.options.id}" has already been updated by another user`
        );
      }
      throw e;
    }

    this.markApiKeysForInvalidation(oldAuth?.apiKey, oldAuth?.createdByUser);

    return transformNotificationPolicySoAttributesToApiResponse({
      id: params.options.id,
      version: updated.version,
      attributes: nextAttrs,
    });
  }

  public async findNotificationPolicies(
    params: FindNotificationPoliciesParams = {}
  ): Promise<FindNotificationPoliciesResponse> {
    const page = params.page ?? DEFAULT_PAGE;
    const perPage = params.perPage ?? DEFAULT_PER_PAGE;

    const filter = this.buildFindFilter(params);
    const sortField = this.mapSortField(params.sortField);

    const res = await this.notificationPolicySavedObjectService.find({
      page,
      perPage,
      search: params.search,
      filter,
      sortField,
      sortOrder: params.sortOrder,
    });

    return {
      items: res.saved_objects.map((so) =>
        transformNotificationPolicySoAttributesToApiResponse({
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

  public async enableNotificationPolicy({
    id,
  }: {
    id: string;
  }): Promise<NotificationPolicyResponse> {
    return this.updatePolicyState(id, { enabled: true });
  }

  public async disableNotificationPolicy({
    id,
  }: {
    id: string;
  }): Promise<NotificationPolicyResponse> {
    return this.updatePolicyState(id, { enabled: false });
  }

  public async snoozeNotificationPolicy({
    id,
    snoozedUntil,
  }: SnoozeNotificationPolicyParams): Promise<NotificationPolicyResponse> {
    return this.updatePolicyState(id, { snoozedUntil });
  }

  public async unsnoozeNotificationPolicy({
    id,
  }: {
    id: string;
  }): Promise<NotificationPolicyResponse> {
    return this.updatePolicyState(id, { snoozedUntil: null });
  }

  public async updateNotificationPolicyApiKey({
    id,
  }: UpdateNotificationPolicyApiKeyParams): Promise<void> {
    let existingPolicy: NotificationPolicySavedObjectAttributes;
    try {
      const doc = await this.notificationPolicySavedObjectService.get(id);
      existingPolicy = doc.attributes;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(`Notification policy with id "${id}" not found`);
      }
      throw e;
    }

    const oldAuth = await this.getDecryptedAuth(id);
    const userProfile = await this.getUserProfile();
    const now = new Date().toISOString();
    const apiKeyAttrs = await this.apiKeyService.create(
      `Notification Policy: ${existingPolicy.name}`
    );

    try {
      await this.notificationPolicySavedObjectService.update({
        id,
        attrs: {
          auth: apiKeyAttrs,
          updatedBy: userProfile.uid,
          updatedByUsername: userProfile.username,
          updatedAt: now,
        },
      });
    } catch (e) {
      this.markApiKeysForInvalidation(apiKeyAttrs.apiKey, false);
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        throw Boom.conflict(
          `Notification policy with id "${id}" has already been updated by another user`
        );
      }
      throw e;
    }

    this.markApiKeysForInvalidation(oldAuth?.apiKey, oldAuth?.createdByUser);
  }

  public async bulkActionNotificationPolicies({
    actions,
  }: BulkActionNotificationPoliciesParams): Promise<BulkActionNotificationPoliciesResponse> {
    const [deleteActions, remainingActions] = partition(actions, (a) => a.action === 'delete');
    const [updateApiKeyActions, updateActions] = partition(
      remainingActions,
      (a) => a.action === 'update_api_key'
    );

    const errors: Array<{ id: string; message: string }> = [];
    let processed = 0;

    if (updateActions.length > 0) {
      const userProfile = await this.getUserProfile();
      const now = new Date().toISOString();

      const objects = updateActions.map((action) => ({
        id: action.id,
        attrs: {
          ...resolveActionAttrs(action),
          updatedBy: userProfile.uid,
          updatedByUsername: userProfile.username,
          updatedAt: now,
        },
      }));

      const updateResults = await this.notificationPolicySavedObjectService.bulkUpdate({
        objects,
      });

      for (const result of updateResults) {
        if ('error' in result) {
          errors.push({ id: result.id, message: result.error.message });
        } else {
          processed++;
        }
      }
    }

    for (const action of updateApiKeyActions) {
      try {
        await this.updateNotificationPolicyApiKey({ id: action.id });
        processed++;
      } catch (e) {
        errors.push({ id: action.id, message: e.message });
      }
    }

    if (deleteActions.length > 0) {
      const deleteIds = deleteActions.map((a) => a.id);
      const authMap = await this.getBulkDecryptedAuth(deleteIds);

      const deleteResults = await this.notificationPolicySavedObjectService.bulkDelete({
        ids: deleteIds,
      });

      for (const result of deleteResults) {
        if ('error' in result) {
          errors.push({ id: result.id, message: result.error.message });
        } else {
          processed++;
          const auth = authMap.get(result.id);
          this.markApiKeysForInvalidation(auth?.apiKey, auth?.createdByUser);
        }
      }
    }

    return { processed, total: actions.length, errors };
  }

  private buildFindFilter(params: FindNotificationPoliciesParams): KueryNode | undefined {
    const conditions: KueryNode[] = [];
    const attrPrefix = `${NOTIFICATION_POLICY_SAVED_OBJECT_TYPE}.attributes`;

    if (params.destinationType) {
      conditions.push(nodeBuilder.is(`${attrPrefix}.destinations.type`, params.destinationType));
    }

    if (params.createdBy) {
      conditions.push(nodeBuilder.is(`${attrPrefix}.createdBy`, params.createdBy));
    }

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
      createdAt: 'createdAt',
      createdByUsername: 'createdByUsername',
      updatedAt: 'updatedAt',
      updatedByUsername: 'updatedByUsername',
    };

    return sortFieldMap[sortField];
  }

  public async getAllTags(params?: { search?: string }): Promise<string[]> {
    return this.notificationPolicySavedObjectService.getDistinctTags({
      search: params?.search,
    });
  }

  public async deleteNotificationPolicy({ id }: { id: string }): Promise<void> {
    await this.getNotificationPolicy({ id });
    const auth = await this.getDecryptedAuth(id);
    await this.notificationPolicySavedObjectService.delete({ id });
    this.markApiKeysForInvalidation(auth?.apiKey, auth?.createdByUser);
  }

  private markApiKeysForInvalidation(apiKey?: string, createdByUser?: boolean): void {
    if (!apiKey || createdByUser) {
      return;
    }

    // the apiKeyService already handles and logs errors, so we can swallow them here
    this.apiKeyService.markApiKeysForInvalidation([apiKey]).catch(() => {});
  }

  private async getDecryptedAuth(
    id: string
  ): Promise<{ apiKey: string; createdByUser: boolean } | null> {
    try {
      const doc =
        await this.esoClient.getDecryptedAsInternalUser<NotificationPolicySavedObjectAttributes>(
          NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          id,
          this.namespace ? { namespace: this.namespace } : undefined
        );
      const auth = doc.attributes?.auth;
      if (!auth?.apiKey) return null;

      return {
        apiKey: auth.apiKey,
        createdByUser: auth.createdByUser,
      };
    } catch {
      return null;
    }
  }

  private async getBulkDecryptedAuth(
    ids: string[]
  ): Promise<Map<string, { apiKey: string; createdByUser: boolean }>> {
    const targetIds = new Set(ids);
    const authMap = new Map<string, { apiKey: string; createdByUser: boolean }>();

    try {
      const finder =
        await this.esoClient.createPointInTimeFinderDecryptedAsInternalUser<NotificationPolicySavedObjectAttributes>(
          {
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            perPage: Math.min(ids.length, 1000),
            ...(this.namespace ? { namespaces: [this.namespace] } : {}),
          }
        );

      for await (const response of finder.find()) {
        for (const so of response.saved_objects) {
          if (targetIds.has(so.id) && so.attributes.auth?.apiKey) {
            authMap.set(so.id, {
              apiKey: so.attributes.auth.apiKey,
              createdByUser: so.attributes.auth.createdByUser,
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
    stateUpdate: { enabled?: boolean; snoozedUntil?: string | null }
  ): Promise<NotificationPolicyResponse> {
    if (stateUpdate.snoozedUntil) {
      validateDateString(stateUpdate.snoozedUntil);
    }

    const userProfile = await this.getUserProfile();
    const now = new Date().toISOString();

    await this.notificationPolicySavedObjectService.update({
      id,
      attrs: {
        ...stateUpdate,
        updatedBy: userProfile.uid,
        updatedByUsername: userProfile.username,
        updatedAt: now,
      },
    });

    return this.getNotificationPolicy({ id });
  }

  private async getUserProfile() {
    return this.userService.getCurrentUserProfile();
  }
}
