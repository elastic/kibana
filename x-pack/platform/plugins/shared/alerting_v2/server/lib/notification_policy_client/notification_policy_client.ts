/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { NotificationPolicyResponse } from '@kbn/alerting-v2-schemas';
import {
  createNotificationPolicyDataSchema,
  updateNotificationPolicyDataSchema,
} from '@kbn/alerting-v2-schemas';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { stringifyZodError } from '@kbn/zod-helpers';
import { inject, injectable } from 'inversify';
import { omit } from 'lodash';
import { type NotificationPolicySavedObjectAttributes } from '../../saved_objects';
import type { ApiKeyServiceContract } from '../services/api_key_service/api_key_service';
import { ApiKeyService } from '../services/api_key_service/api_key_service';
import type { NotificationPolicySavedObjectServiceContract } from '../services/notification_policy_saved_object_service/notification_policy_saved_object_service';
import { NotificationPolicySavedObjectServiceScopedToken } from '../services/notification_policy_saved_object_service/tokens';
import type { UserServiceContract } from '../services/user_service/user_service';
import { UserService } from '../services/user_service/user_service';
import type {
  CreateNotificationPolicyParams,
  FindNotificationPoliciesParams,
  FindNotificationPoliciesResponse,
  UpdateNotificationPolicyParams,
} from './types';

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
    @inject(ApiKeyService) private readonly apiKeyService: ApiKeyServiceContract
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

    const policyName = parsed.data.name ?? existingPolicy.name;
    const apiKeyAttrs = await this.apiKeyService.create(`Notification Policy: ${policyName}`);

    const nextAttrs: NotificationPolicySavedObjectAttributes = {
      ...omit(existingPolicy, ['id', 'version', 'auth']),
      ...parsed.data,
      auth: apiKeyAttrs,
      updatedBy: userProfileUid,
      updatedAt: now,
    };

    try {
      const updated = await this.notificationPolicySavedObjectService.update({
        id: params.options.id,
        attrs: nextAttrs,
        version: params.options.version,
      });

      return {
        id: params.options.id,
        version: updated.version,
        ...omit(nextAttrs, ['auth']),
        auth: toAuthResponse(nextAttrs.auth),
      };
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        throw Boom.conflict(
          `Notification policy with id "${params.options.id}" has already been updated by another user`
        );
      }
      throw e;
    }
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

  public async deleteNotificationPolicy({ id }: { id: string }): Promise<void> {
    await this.getNotificationPolicy({ id });
    await this.notificationPolicySavedObjectService.delete({ id });
  }

  private async getUserProfileUid(): Promise<string | null> {
    return this.userService.getCurrentUserProfileUid();
  }
}
