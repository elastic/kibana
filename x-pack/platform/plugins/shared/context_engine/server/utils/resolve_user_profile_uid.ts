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
 * requests carry it. A basic-auth realm user is looked up by username and realm as the internal
 * user; an API key resolves to its owner's profile when the key may read itself.
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
  if (!user) {
    return undefined;
  }
  if (user.profile_uid) {
    return user.profile_uid;
  }
  if (user.authentication_type === 'api_key') {
    return resolveApiKeyOwnerProfileUid({ request, esClient });
  }
  if (user.authentication_type !== 'realm' && user.authentication_type !== 'token') {
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
  request,
  esClient,
}: {
  request: KibanaRequest;
  esClient: IScopedClusterClient;
}): Promise<string | undefined> => {
  const id = extractApiKeyIdFromAuthzHeader(request.headers.authorization);
  if (!id) {
    return undefined;
  }
  try {
    const { api_keys: apiKeys } = await esClient.asCurrentUser.security.getApiKey({
      id,
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
