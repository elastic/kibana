/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'assert';
import type { RequestHandlerContext } from '@kbn/core/server';
import {
  type CoreSetup,
  type CoreStart,
  type Logger,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import type { ISavedObjectsRepository, SavedObject } from '@kbn/core-saved-objects-api-server';
import {
  interceptInteractionUserRecordSavedObject,
  type InterceptInteractionUserRecordAttributes,
} from '../saved_objects';
import { TRIGGER_USER_INTERACTION_METADATA_API_ROUTE } from '../../common/constants';

export class InterceptUserInteractionService {
  private savedObjectsClient?: ISavedObjectsRepository;
  private savedObjectRef = interceptInteractionUserRecordSavedObject;

  setup(core: CoreSetup, logger: Logger) {
    const router = core.http.createRouter<RequestHandlerContext>();

    router.get(
      {
        path: TRIGGER_USER_INTERACTION_METADATA_API_ROUTE,
        validate: {
          params: schema.object({
            triggerId: schema.string(),
          }),
        },
        security: {
          authz: {
            enabled: false,
            reason:
              'route is public and provides information about the next product intercept trigger',
          },
        },
      },
      async (ctx, request, response) => {
        const coreRequestHandlerCtx = await ctx.core;
        const userId = coreRequestHandlerCtx.security.authc.getCurrentUser()?.profile_uid;

        if (!userId) {
          return response.forbidden();
        }

        const result = await this.getUserInteractionSavedObject(userId, request.params.triggerId);

        return response.ok({
          body: result?.attributes.metadata,
        });
      }
    );

    router.post(
      {
        path: TRIGGER_USER_INTERACTION_METADATA_API_ROUTE,
        validate: {
          params: schema.object({
            triggerId: schema.string(),
          }),
          body: schema.object({
            lastInteractedInterceptId: schema.number(),
          }),
        },
        security: {
          authz: {
            enabled: false,
            reason: 'This route delegates authorization to SO client.',
          },
          authc: {
            enabled: true,
          },
        },
      },
      async (ctx, request, response) => {
        const coreRequestHandlerCtx = await ctx.core;
        const userId = coreRequestHandlerCtx.security.authc.getCurrentUser()?.profile_uid;

        if (!userId) {
          return response.forbidden();
        }

        await this.recordUserInteractionForTrigger(userId, request.params.triggerId, request.body);

        return response.created();
      }
    );
  }

  public start(core: CoreStart) {
    this.savedObjectsClient = core.savedObjects.createInternalRepository([
      this.savedObjectRef.name,
    ]);
  }

  // returns an id scoped to the current user
  private getSavedObjectId = (triggerId: string, userId: string) => `${triggerId}:${userId}`;

  private async getUserInteractionSavedObject(
    userId: string,
    triggerId: string
  ): Promise<SavedObject<InterceptInteractionUserRecordAttributes> | null> {
    assert.ok(this.savedObjectsClient, 'savedObjectsClient is not initialized');

    try {
      const userInteractionSavedObject =
        await this.savedObjectsClient.get<InterceptInteractionUserRecordAttributes>(
          this.savedObjectRef.name,
          this.getSavedObjectId(triggerId, userId)
        );

      return userInteractionSavedObject;
    } catch (e) {
      // If the saved object is not found, return null
      if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
        return null;
      }

      throw e;
    }
  }

  private async recordUserInteractionForTrigger(
    userId: string,
    triggerId: string,
    data: InterceptInteractionUserRecordAttributes['metadata']
  ) {
    assert.ok(this.savedObjectsClient, 'savedObjectsClient is not initialized');

    let interactionTriggerSavedObject = await this.getUserInteractionSavedObject(userId, triggerId);

    const docId = this.getSavedObjectId(triggerId, userId);

    if (!interactionTriggerSavedObject) {
      interactionTriggerSavedObject = await this.savedObjectsClient.create(
        this.savedObjectRef.name,
        { userId, triggerId, metadata: data },
        { id: docId }
      );
    } else {
      interactionTriggerSavedObject =
        (await this.savedObjectsClient.update<InterceptInteractionUserRecordAttributes>(
          this.savedObjectRef.name,
          docId,
          {
            ...interactionTriggerSavedObject.attributes,
            metadata: {
              ...interactionTriggerSavedObject.attributes.metadata,
              ...data,
            },
          },
          {
            version: interactionTriggerSavedObject.version,
          }
        )) as SavedObject<InterceptInteractionUserRecordAttributes>;
    }

    return interactionTriggerSavedObject?.attributes;
  }
}
