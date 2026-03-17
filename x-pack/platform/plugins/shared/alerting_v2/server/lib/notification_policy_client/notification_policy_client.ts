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
import { stringifyZodError } from '@kbn/zod-helpers';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { inject, injectable } from 'inversify';
import { omit } from 'lodash';
import {
  NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
  type NotificationPolicySavedObjectAttributes,
} from '../../saved_objects';
import { EncryptedSavedObjectsClientToken } from '../dispatcher/steps/dispatch_step_tokens';
import type { ApiKeyServiceContract } from '../services/api_key_service/api_key_service';
import { ApiKeyService } from '../services/api_key_service/api_key_service';
import type { NotificationPolicySavedObjectServiceContract } from '../services/notification_policy_saved_object_service/notification_policy_saved_object_service';
import { NotificationPolicySavedObjectServiceScopedToken } from '../services/notification_policy_saved_object_service/tokens';
import type { UserServiceContract } from '../services/user_service/user_service';
import { UserService } from '../services/user_service/user_service';
import type {
  BulkActionNotificationPoliciesParams,
  BulkActionNotificationPoliciesResponse,
  CreateNotificationPolicyParams,
  FindNotificationPoliciesParams,
  FindNotificationPoliciesResponse,
  SnoozeNotificationPolicyParams,
  UpdateNotificationPolicyParams,
} from './types';
import { NotificationPolicyNamespaceToken } from './tokens';
import { validateDateString } from './utils';

const resolveActionAttrs = (
  action: NotificationPolicyBulkAction
): Partial<NotificationPolicySavedObjectAttributes> => {
  switch (action.action) {
    case 'enable':
      return { enabled: true, snoozedUntil: undefined };
    case 'disable':
      return { enabled: false, snoozedUntil: undefined };
    case 'snooze':
      return { snoozedUntil: action.snoozed_until };
  }
};

const toAuthResponse = (
  auth: NotificationPolicySavedObjectAttributes['auth']
): NotificationPolicyResponse['auth'] => {
  const { apiKey: _, ...rest } = auth;
  return rest;
};

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

    const userProfileUid = await this.getUserProfileUid();
    const now = new Date().toISOString();

    const apiKeyAttrs = await this.apiKeyService.create(`Notification Policy: ${params.data.name}`);

    const attributes: NotificationPolicySavedObjectAttributes = {
      ...parsed.data,
      enabled: true,
      auth: apiKeyAttrs,
      createdBy: userProfileUid,
      createdAt: now,
      updatedBy: userProfileUid,
      updatedAt: now,
    };

    try {
      const { id, version } = await this.notificationPolicySavedObjectService.create({
        attrs: attributes,
        id: params.options?.id,
      });

      return { id, version, ...omit(attributes, ['auth']), auth: toAuthResponse(attributes.auth) };
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
      return {
        id,
        version: doc.version,
        ...omit(doc.attributes, ['auth']),
        auth: toAuthResponse(doc.attributes.auth),
      };
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
        {
          id: doc.id,
          version: doc.version,
          ...omit(doc.attributes, ['auth']),
          auth: toAuthResponse(doc.attributes.auth),
        },
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

    const userProfileUid = await this.getUserProfileUid();
    const now = new Date().toISOString();

    const existingPolicy = await this.getNotificationPolicy({
      id: params.options.id,
    });

    const oldAuth = await this.getDecryptedAuth(params.options.id);

    const policyName = parsed.data.name ?? existingPolicy.name;
    const apiKeyAttrs = await this.apiKeyService.create(`Notification Policy: ${policyName}`);

    const nextAttrs: NotificationPolicySavedObjectAttributes = {
      ...omit(existingPolicy, ['id', 'version', 'auth']),
      ...parsed.data,
      auth: apiKeyAttrs,
      updatedBy: userProfileUid,
      updatedAt: now,
    };

    let updated: { id: string; version?: string };
    try {
      updated = await this.notificationPolicySavedObjectService.update({
        id: params.options.id,
        attrs: nextAttrs,
        version: params.options.version,
      });
    } catch (e) {
      // If update fails we explicitly mark the new API key for invalidation
      this.markApiKeysForInvalidation(nextAttrs.auth?.apiKey, false);
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        throw Boom.conflict(
          `Notification policy with id "${params.options.id}" has already been updated by another user`
        );
      }
      throw e;
    }

    this.markApiKeysForInvalidation(oldAuth?.apiKey, oldAuth?.createdByUser);

    return {
      id: params.options.id,
      version: updated.version,
      ...omit(nextAttrs, ['auth']),
      auth: toAuthResponse(nextAttrs.auth),
    };
  }

  public async findNotificationPolicies(
    params: FindNotificationPoliciesParams = {}
  ): Promise<FindNotificationPoliciesResponse> {
    const page = params.page ?? 1;
    const perPage = params.perPage ?? 20;

    const res = await this.notificationPolicySavedObjectService.find({ page, perPage });

    return {
      items: res.saved_objects.map((so) => ({
        id: so.id,
        version: so.version,
        ...so.attributes,
      })),
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
    return this.updatePolicyState(id, { enabled: true, snoozedUntil: undefined });
  }

  public async disableNotificationPolicy({
    id,
  }: {
    id: string;
  }): Promise<NotificationPolicyResponse> {
    return this.updatePolicyState(id, { enabled: false, snoozedUntil: undefined });
  }

  public async snoozeNotificationPolicy({
    id,
    snoozedUntil,
  }: SnoozeNotificationPolicyParams): Promise<NotificationPolicyResponse> {
    return this.updatePolicyState(id, { snoozedUntil });
  }

  public async bulkActionNotificationPolicies({
    actions,
  }: BulkActionNotificationPoliciesParams): Promise<BulkActionNotificationPoliciesResponse> {
    const userProfileUid = await this.getUserProfileUid();
    const now = new Date().toISOString();

    const objects = actions.map((action) => ({
      id: action.id,
      attrs: {
        ...resolveActionAttrs(action),
        updatedBy: userProfileUid,
        updatedAt: now,
      },
    }));

    const results = await this.notificationPolicySavedObjectService.bulkUpdate({ objects });

    const errors: Array<{ id: string; message: string }> = [];
    let processed = 0;

    for (const result of results) {
      if ('error' in result) {
        errors.push({ id: result.id, message: result.error.message });
      } else {
        processed++;
      }
    }

    return { processed, total: actions.length, errors };
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

  private async updatePolicyState(
    id: string,
    stateUpdate: { enabled?: boolean; snoozedUntil?: string | undefined }
  ): Promise<NotificationPolicyResponse> {
    if (stateUpdate.snoozedUntil) {
      validateDateString(stateUpdate.snoozedUntil);
    }

    const userProfileUid = await this.getUserProfileUid();
    const now = new Date().toISOString();

    await this.notificationPolicySavedObjectService.update({
      id,
      attrs: { ...stateUpdate, updatedBy: userProfileUid, updatedAt: now },
    });

    return this.getNotificationPolicy({ id });
  }

  private async getUserProfileUid(): Promise<string | null> {
    return this.userService.getCurrentUserProfileUid();
  }
}
