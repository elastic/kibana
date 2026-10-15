/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, IScopedClusterClient } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { buildUserScopeId } from '@kbn/context-engine-plugin/common/memory';
import { resolveUserProfileUid } from '@kbn/context-engine-plugin/server/utils/resolve_user_profile_uid';

/** The `user://<profile uid>` scope of the caller; a caller without a profile cannot own a memory. */
export const resolveMemoryUserScopeId = async ({
  request,
  esClient,
  getCoreStart,
}: {
  request: KibanaRequest;
  esClient: IScopedClusterClient;
  getCoreStart: () => Promise<CoreStart>;
}): Promise<string> => {
  const coreStart = await getCoreStart();
  const profileUid = await resolveUserProfileUid({
    request,
    security: coreStart.security,
    esClient: esClient.asInternalUser,
  });
  if (!profileUid) {
    throw new Error('Cannot store user memory without a user profile.');
  }
  return buildUserScopeId(profileUid);
};
