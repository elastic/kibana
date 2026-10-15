/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient, KibanaRequest } from '@kbn/core/server';
import {
  extractApiKeyIdFromAuthzHeader,
  type SecurityServiceStart,
} from '@kbn/core-security-server';
import { isResponseError } from '@kbn/es-errors';

const PROFILE_SUGGESTIONS = 10;

/**
 * The profile uid Elasticsearch matches against `scope_id`. Sessions and enriched Task Manager
 * requests carry it. A request authenticated with an API key, including a Task Manager request
 * running under the caller's key, resolves to the key owner's profile. A basic-auth realm user is
 * looked up by username and realm as the internal user.
 */
export const resolveUserProfileUid = async ({
  request,
  security,
  esClient,
}: {
  request: KibanaRequest;
  security: SecurityServiceStart;
  esClient: IScopedClusterClient;
}): Promise<string | undefined> => {
  const user = security.authc.getCurrentUser(request);
  if (user?.profile_uid) {
    return user.profile_uid;
  }
  const apiKeyId = extractApiKeyIdFromAuthzHeader(request.headers.authorization);
  if (apiKeyId) {
    return resolveApiKeyOwnerProfileUid({ apiKeyId, esClient });
  }
  if (!user || (user.authentication_type !== 'realm' && user.authentication_type !== 'token')) {
    return undefined;
  }

  const { profiles } = await esClient.asInternalUser.security.suggestUserProfiles({
    name: user.username,
    size: PROFILE_SUGGESTIONS,
  });
  return profiles.find(
    ({ user: profileUser }) =>
      profileUser.username === user.username &&
      profileUser.realm_name === user.authentication_realm?.name
  )?.uid;
};

const resolveApiKeyOwnerProfileUid = async ({
  apiKeyId,
  esClient,
}: {
  apiKeyId: string;
  esClient: IScopedClusterClient;
}): Promise<string | undefined> => {
  try {
    const { api_keys: apiKeys } = await esClient.asCurrentUser.security.getApiKey({
      id: apiKeyId,
      with_profile_uid: true,
    });
    return apiKeys?.[0]?.profile_uid;
  } catch (error) {
    if (isResponseError(error) && (error.statusCode === 403 || error.statusCode === 404)) {
      return undefined;
    }
    throw error;
  }
};
