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
  security?: SecurityPluginStart;
  logger: Logger;
}

export const getUserInfo = async ({
  request,
  security,
  logger,
}: GetUserInfoParams): Promise<User | undefined> => {
  if (!security) {
    logger.debug('Security plugin is not available, skipping user info fetch');

    return undefined;
  }

  try {
    const userProfile = await security.userProfiles?.getCurrent({
      request,
    });

    if (userProfile != null) {
      // Use display name priority: full_name > email > username
      const displayName =
        userProfile.user.full_name || userProfile.user.email || userProfile.user.username;

      return {
        username: displayName,
        full_name: userProfile.user.full_name ?? null,
        email: userProfile.user.email ?? null,
        profile_uid: userProfile.uid,
      };
    }
  } catch (error) {
    logger.debug(`Failed to retrieve user profile, falling back to authc: ${error}`);
  }

  try {
    const user = security.authc.getCurrentUser(request);

    if (user != null) {
      // Use display name priority: full_name > email > username
      const displayName = user.full_name || user.email || user.username;

      return {
        username: displayName,
        full_name: user.full_name ?? null,
        email: user.email ?? null,
        profile_uid: null,
      };
    }
  } catch (error) {
    logger.debug(`Failed to retrieve user info from authc: ${error}`);
  }

  return undefined;
};
