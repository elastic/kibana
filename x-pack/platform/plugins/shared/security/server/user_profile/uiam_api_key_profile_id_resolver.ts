/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import type { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import { isExternalUiamCredential } from '@kbn/core-security-server';

import { getDetailedErrorMessage } from '../errors';
import { isExternalApiKey, type UiamServicePublic } from '../uiam';

/**
 * Elastic Cloud users are not part of a security domain, so Elasticsearch creates their profile ID
 * from the username alone. Their username is the Cloud user ID, so the profile ID can be derived
 * without a profile document.
 */
const getCloudUserProfileId = (userId: number) =>
  `u_${createHash('sha256').update(String(userId)).digest('base64url')}_0`;

interface UiamApiKeyProfileIdResolverParams {
  uiam: UiamServicePublic;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  logger: Logger;
}

/**
 * Creates a function that resolves the profile ID of the user who created a UIAM API key, as UIAM
 * reports it. The ID is not available for a key created by another API key, and external
 * (user-created) keys are skipped: UIAM rejects them when they carry Kibana's client
 * authentication. Failures are logged and resolve to `undefined`. The lookup is cached by
 * {@link UiamServicePublic.getApiKeyCreator}.
 */
export const createUiamApiKeyProfileIdResolver = ({
  uiam,
  getCurrentUser,
  logger,
}: UiamApiKeyProfileIdResolverParams) => {
  return async (
    request: KibanaRequest,
    authorization: HTTPAuthorizationHeader
  ): Promise<string | undefined> => {
    if (isExternalUiamCredential(request) || isExternalApiKey(getCurrentUser(request))) {
      logger.debug(`Skipping the creator lookup for an external UIAM API key.`);
      return undefined;
    }

    try {
      const creator = await uiam.getApiKeyCreator(authorization);
      const profileId =
        creator?.type === 'user' ? getCloudUserProfileId(creator.user_id) : undefined;
      if (!profileId) {
        logger.debug(`The UIAM API key was not created by a user, cannot retrieve profile id.`);
      }

      return profileId;
    } catch (error) {
      logger.error(
        `Failed to retrieve the creator of a UIAM API key for user profile retrieval: ${getDetailedErrorMessage(
          error
        )}`
      );
      return undefined;
    }
  };
};

export type UiamApiKeyProfileIdResolver = ReturnType<typeof createUiamApiKeyProfileIdResolver>;
