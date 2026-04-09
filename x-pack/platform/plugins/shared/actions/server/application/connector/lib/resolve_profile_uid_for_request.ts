/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

export async function resolveProfileUidForRequest({
  request,
  getCurrentUser,
  getCurrentUserProfileIdFromAPIKey,
}: {
  request: KibanaRequest;
  getCurrentUser?: (request: KibanaRequest) => Promise<{ profile_uid?: string } | null>;
  getCurrentUserProfileIdFromAPIKey?: (request: KibanaRequest) => Promise<string | undefined>;
}): Promise<string | undefined> {
  const profileUidFromAPIKey = await getCurrentUserProfileIdFromAPIKey?.(request);
  if (profileUidFromAPIKey) {
    return profileUidFromAPIKey;
  }
  const currentUser = await getCurrentUser?.(request);
  return currentUser?.profile_uid;
}
