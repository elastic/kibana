/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';

/**
 * Collects every distinct profile UID we can associate with the request.
 * OAuth tokens may be keyed by one identifier (e.g. `authc` profile_uid) while
 * another source (user profile service, API key metadata) may differ; merging lookups
 * avoids false `not_connected` after refresh.
 */
export async function resolveProfileUidsForRequest({
  request,
  getCurrentUser,
  getCurrentUserProfileUid,
  getCurrentUserProfileIdFromAPIKey,
}: {
  request: KibanaRequest;
  getCurrentUser?: (request: KibanaRequest) => Promise<{ profile_uid?: string } | null>;
  getCurrentUserProfileUid?: (request: KibanaRequest) => Promise<string | undefined>;
  getCurrentUserProfileIdFromAPIKey?: (request: KibanaRequest) => Promise<string | undefined>;
}): Promise<string[]> {
  const uids = new Set<string>();

  const currentUser = await getCurrentUser?.(request);
  if (currentUser?.profile_uid) {
    uids.add(currentUser.profile_uid);
  }

  const fromUserProfile = await getCurrentUserProfileUid?.(request);
  if (fromUserProfile) {
    uids.add(fromUserProfile);
  }

  const fromApiKey = await getCurrentUserProfileIdFromAPIKey?.(request);
  if (fromApiKey) {
    uids.add(fromApiKey);
  }

  return [...uids];
}
