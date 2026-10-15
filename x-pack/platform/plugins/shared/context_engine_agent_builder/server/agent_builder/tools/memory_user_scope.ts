/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { buildUserScopeId } from '@kbn/context-engine-plugin/common/memory';

/**
 * The `user://<profile uid>` scope of the caller. The uid is what Elasticsearch matches in the
 * memory DLS template, so a caller without an activated profile cannot own a memory.
 */
export const resolveMemoryUserScopeId = async ({
  request,
  getSecurityStart,
}: {
  request: KibanaRequest;
  getSecurityStart: () => Promise<SecurityPluginStart | undefined>;
}): Promise<string> => {
  const security = await getSecurityStart();
  const profileUid = security?.authc.getCurrentUser(request)?.profile_uid;
  if (!profileUid) {
    throw new Error('Cannot store user memory without a user profile.');
  }
  return buildUserScopeId(profileUid);
};
