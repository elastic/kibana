/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { REALM_USER_ID_PREFIX } from '@kbn/agent-builder-common';

export interface StableUserIdAuthUser {
  username?: string;
  profile_uid?: string;
  authentication_type?: string;
  authentication_realm?: { type?: string; name?: string };
}

/**
 * Builds a stable principal id for Agent Builder ownership checks.
 *
 * Usernames alone are not unique across Elasticsearch authentication realms
 * (e.g. file vs native). Prefer the Kibana user profile uid when present;
 * otherwise encode realm type/name with the username so same-username
 * principals in different realms remain distinct.
 *
 * The `realm:` prefix keeps synthetic ids distinguishable from profile uids.
 */
export const toStableUserId = async ({
  authUser,
  request,
  resolveApiKeyProfileUid,
}: {
  authUser: StableUserIdAuthUser;
  request: KibanaRequest;
  resolveApiKeyProfileUid: () => Promise<string | undefined>;
}): Promise<string | undefined> => {
  // Fake requests always authenticate with an API key, even when their identity hides it.
  const isApiKey = request.isFakeRequest || authUser.authentication_type === 'api_key';
  let profileUid = authUser.profile_uid;

  if (isApiKey && profileUid === undefined) {
    profileUid = await resolveApiKeyProfileUid();
  }

  if (profileUid) {
    return profileUid;
  }

  if (isApiKey) {
    return undefined;
  }

  const realmType = authUser.authentication_realm?.type;
  const realmName = authUser.authentication_realm?.name;
  const { username } = authUser;
  if (!realmType || !realmName || !username) {
    return undefined;
  }

  return `${REALM_USER_ID_PREFIX}${JSON.stringify([realmType, realmName, username])}`;
};

/**
 * Resolves the API key creator's profile uid via Elasticsearch, when available.
 *
 * `getCurrentUser` for API-key auth often omits `profile_uid`. Looking up the key with
 * `with_profile_uid` recovers the creator's profile so ownership can match interactive
 * sessions for the same user. Older keys or creators without an activated profile return
 * undefined and callers fall back to username matching.
 */
export const resolveApiKeyOwnerProfileUid = async ({
  apiKeyId: id,
  esClient,
}: {
  apiKeyId: string | undefined;
  esClient: ElasticsearchClient;
}): Promise<string | undefined> => {
  if (!id) {
    return undefined;
  }

  try {
    const response = await esClient.security.getApiKey({
      with_profile_uid: true,
      id,
    });

    return response.api_keys?.[0]?.profile_uid;
  } catch (error) {
    if (
      error instanceof errors.ResponseError &&
      (error.statusCode === 403 || error.statusCode === 404)
    ) {
      return undefined;
    }
    throw error;
  }
};
