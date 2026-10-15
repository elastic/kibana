/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { SecurityServiceStart } from '@kbn/core-security-server';

const PROFILE_SUGGESTIONS = 10;

/**
 * The profile uid Elasticsearch matches against `scope_id`. Sessions and enriched Task Manager
 * requests carry it; a basic-auth request does not, so the profile is looked up by username and
 * realm as the internal user. API keys never resolve, matching the Elasticsearch side.
 */
export const resolveUserProfileUid = async ({
  request,
  security,
  esClient,
}: {
  request: KibanaRequest;
  security: SecurityServiceStart;
  esClient: ElasticsearchClient;
}): Promise<string | undefined> => {
  const user = security.authc.getCurrentUser(request);
  if (!user) {
    return undefined;
  }
  if (user.profile_uid) {
    return user.profile_uid;
  }
  if (user.authentication_type !== 'realm' && user.authentication_type !== 'token') {
    return undefined;
  }

  const { profiles } = await esClient.security.suggestUserProfiles({
    name: user.username,
    size: PROFILE_SUGGESTIONS,
  });
  return profiles.find(
    ({ user: profileUser }) =>
      profileUser.username === user.username &&
      profileUser.realm_name === user.authentication_realm?.name
  )?.uid;
};
