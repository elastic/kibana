/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbiddenError } from '@kbn/context-engine-plugin/server/routes/memory_user';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';

export const NO_USER_PROFILE_MESSAGE =
  'The caller has no user profile, so memory cannot be attributed to a user.';

export const getCallerProfileId = async ({
  coreStart,
  request,
}: {
  coreStart: CoreStart;
  request: KibanaRequest;
}): Promise<string> => {
  const profileId = await coreStart.userProfile.getCurrentProfileId({ request });
  if (profileId === null) {
    throw forbiddenError(NO_USER_PROFILE_MESSAGE);
  }
  return profileId;
};
