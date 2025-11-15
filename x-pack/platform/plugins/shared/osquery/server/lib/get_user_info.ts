/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { User } from '../../common/types/user';

interface GetUserInfoParams {
  request: KibanaRequest;
  security: SecurityPluginStart;
  logger: Logger;
}

/**
 * Retrieves the current user's information including username, email, full name, and profile UID.
 *
 * This function follows the same pattern as the Cases plugin's getUserInfo method:
 * 1. First tries to get the user profile from the security plugin (works in Cloud/Serverless)
 * 2. Falls back to authentication service if profile is unavailable (works in ESS)
 * 3. Returns system username for fake requests
 * 4. Returns null values if all methods fail
 *
 * The profile_uid is the actual user ID in Cloud/Serverless environments, while username
 * is the human-readable identifier.
 */
export async function getUserInfo({ request, security, logger }: GetUserInfoParams): Promise<User> {
  // Try to get user profile (Cloud/Serverless)
  try {
    const userProfile = await security.userProfiles.getCurrent({
      request,
    });

    if (userProfile != null) {
      return {
        username: userProfile.user.username,
        full_name: userProfile.user.full_name ?? null,
        email: userProfile.user.email ?? null,
        profile_uid: userProfile.uid,
      };
    }
  } catch (error) {
    logger.debug(`Failed to retrieve user profile, falling back to authc: ${error}`);
  }

  // Fallback to authentication service (ESS)
  try {
    const user = security.authc.getCurrentUser(request);

    if (user != null) {
      return {
        username: user.username,
        full_name: user.full_name ?? null,
        email: user.email ?? null,
      };
    }
  } catch (error) {
    logger.debug(`Failed to retrieve user info from authc: ${error}`);
  }

  // Fake request fallback
  if (request.isFakeRequest) {
    return {
      username: 'elastic/kibana',
      full_name: null,
      email: null,
    };
  }

  // Final fallback
  return {
    username: null,
    full_name: null,
    email: null,
  };
}
