/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { buildUserScopeId } from '@kbn/context-engine-plugin/common/memory';

/**
 * The `user://<profile uid>` scope of the caller. The uid is what Elasticsearch matches in the
 * memory DLS template, so a caller without an activated profile cannot own a memory. Core's
 * security service is used because it also resolves the profile on enriched Task Manager requests.
 */
export const resolveMemoryUserScopeId = async ({
  request,
  getCoreStart,
}: {
  request: KibanaRequest;
  getCoreStart: () => Promise<CoreStart>;
}): Promise<string> => {
  const coreStart = await getCoreStart();
  const profileUid = coreStart.security.authc.getCurrentUser(request)?.profile_uid;
  if (!profileUid) {
    throw new Error('Cannot store user memory without a user profile.');
  }
  return buildUserScopeId(profileUid);
};
