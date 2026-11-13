/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import type { IClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/core-security-common';

import { getDetailedErrorMessage, getErrorStatusCode } from '../errors';
import type { UiamServicePublic } from '../uiam';

/**
 * Elastic Cloud users are not part of a security domain, so Elasticsearch creates their profile ID
 * from the username alone. Their username is the Cloud user ID, so the profile ID can be derived
 * without a profile document.
 */
const getCloudUserProfileId = (userId: number) =>
  `u_${createHash('sha256').update(String(userId)).digest('base64url')}_0`;

interface UiamApiKeyProfileIdResolverParams {
  uiam: UiamServicePublic;
  clusterClient: IClusterClient;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  logger: Logger;
}

export type UiamApiKeyProfileIdResolver = (request: KibanaRequest) => Promise<string | undefined>;

/**
 * Creates a function that resolves the profile ID of the user who created the UIAM API key a
 * request carries, as {@link UiamServicePublic.getApiKeyCreator} reports it. The ID is not
 * available for a key created by another API key, or for an external (user-created) key. Failures
 * are logged and resolve to `undefined`.
 */
export const createUiamApiKeyProfileIdResolver = ({
  uiam,
  clusterClient,
  getCurrentUser,
  logger,
}: UiamApiKeyProfileIdResolverParams): UiamApiKeyProfileIdResolver => {
  return async (request) => {
    try {
      const creator = await uiam.getApiKeyCreator({ request, user: getCurrentUser(request) });
      if (creator?.type !== 'user') {
        logger.debug(`UIAM reported no user creator for the API key, cannot retrieve profile id.`);
        return undefined;
      }

      // A fake request reaches here without its key being authenticated, and the cached creator
      // would outlive a revoked or expired key, so Elasticsearch checks the key before the creator
      // is trusted. Checking only now spares the call when there is no profile id to return.
      if (request.isFakeRequest) {
        await clusterClient.asScoped(request).asCurrentUser.security.authenticate();
      }

      return getCloudUserProfileId(creator.user_id);
    } catch (error) {
      // A task can outlive its key, so a key that no longer authenticates is expected.
      if (getErrorStatusCode(error) === 401) {
        logger.debug(`The UIAM API key no longer authenticates, cannot retrieve profile id.`);
        return undefined;
      }

      logger.error(
        `Failed to resolve the creator of a UIAM API key for user profile retrieval: ${getDetailedErrorMessage(
          error
        )}`
      );
      return undefined;
    }
  };
};
