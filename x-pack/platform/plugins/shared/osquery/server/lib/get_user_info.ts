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
    const currentUser = security.authc.getCurrentUser(request);

    if (!currentUser) {
      return undefined;
    }

    const userProfile = await security.userProfiles.getCurrent({ request });

    return {
      username: currentUser.username,
      full_name: userProfile?.user.full_name ?? null,
      email: userProfile?.user.email ?? null,
      profile_uid: userProfile?.uid ?? null,
    };
  } catch (error) {
    logger.error(`Failed to fetch user info: ${error.message}`);

    return undefined;
  }
};
