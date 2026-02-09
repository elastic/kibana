/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { inject, injectable } from 'inversify';
import { type NotificationPolicySavedObjectAttributes } from '../../saved_objects';
import type { NotificationPolicySavedObjectServiceContract } from '../services/notification_policy_saved_object_service/notification_policy_saved_object_service';
import { NotificationPolicySavedObjectService } from '../services/notification_policy_saved_object_service/notification_policy_saved_object_service';
import type { UserServiceContract } from '../services/user_service/user_service';
import type {
  CreateNotificationPolicyParams,
  NotificationPolicyResponse,
  UpdateNotificationPolicyData,
} from './types';

@injectable()
export class NotificationPolicyClient {
  constructor(
    @inject(NotificationPolicySavedObjectService)
    private readonly notificationPolicySavedObjectService: NotificationPolicySavedObjectServiceContract,
    @inject(UserService) private readonly userService: UserServiceContract
  ) {}

  public async createNotificationPolicy(
    params: CreateNotificationPolicyParams
  ): Promise<NotificationPolicyResponse> {
    const userProfileUid = await this.getUserProfileUid();
    const now = new Date().toISOString();

    const notificationPolicyAttributes: NotificationPolicySavedObjectAttributes = {
      name: params.data.name,
      workflow_id: params.data.workflow_id,
      createdBy: userProfileUid,
      createdAt: now,
      updatedBy: userProfileUid,
      updatedAt: now,
    };

    let id: string;
    try {
      id = await this.notificationPolicySavedObjectService.create({
        attrs: notificationPolicyAttributes,
        id: params.options?.id,
      });
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        const conflictId = params.options?.id ?? 'unknown';
        throw Boom.conflict(`Notification policy with id "${conflictId}" already exists`);
      }
      throw e;
    }

    return { id, ...notificationPolicyAttributes };
  }

  public async getNotificationPolicy({ id }: { id: string }): Promise<NotificationPolicyResponse> {
    try {
      const doc = await this.notificationPolicySavedObjectService.get(id);
      const attrs = doc.attributes;
      return { id, ...attrs };
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(`Notification policy with id "${id}" not found`);
      }
      throw e;
    }
  }

  public async updateNotificationPolicy({
    id,
    data,
  }: {
    id: string;
    data: UpdateNotificationPolicyData;
  }): Promise<NotificationPolicyResponse> {
    const userProfileUid = await this.getUserProfileUid();
    const now = new Date().toISOString();

    let existingAttrs: NotificationPolicySavedObjectAttributes;
    let existingVersion: string | undefined;
    try {
      const doc = await this.notificationPolicySavedObjectService.get(id);
      existingAttrs = doc.attributes;
      existingVersion = doc.version;
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(`Notification policy with id "${id}" not found`);
      }
      throw e;
    }

    const nextAttrs: NotificationPolicySavedObjectAttributes = {
      ...existingAttrs,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.workflow_id !== undefined && { workflow_id: data.workflow_id }),
      updatedBy: userProfileUid,
      updatedAt: now,
    };

    try {
      await this.notificationPolicySavedObjectService.update({
        id,
        attrs: nextAttrs,
        version: existingVersion,
      });
    } catch (e) {
      if (SavedObjectsErrorHelpers.isConflictError(e)) {
        throw Boom.conflict(
          `Notification policy with id "${id}" has already been updated by another user`
        );
      }
      throw e;
    }

    return { id, ...nextAttrs };
  }

  public async deleteNotificationPolicy({ id }: { id: string }): Promise<void> {
    try {
      await this.notificationPolicySavedObjectService.get(id);
    } catch (e) {
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        throw Boom.notFound(`Notification policy with id "${id}" not found`);
      }
      throw e;
    }

    await this.notificationPolicySavedObjectService.delete({ id });
  }

  private async getUserProfileUid(): Promise<string | null> {
    return this.userService.getCurrentUserProfileUid();
  }
}
