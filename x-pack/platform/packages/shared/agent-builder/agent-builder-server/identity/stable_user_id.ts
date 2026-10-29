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

const KIBANA_APPLICATION = 'kibana-.kibana';
const API_KEY_SCHEME = 'apikey ';

/** The id of the API key in an `Authorization: ApiKey <base64 id:key>` header. */
const apiKeyIdFromAuthorization = (authorization: string | string[] | undefined) => {
  if (
    typeof authorization !== 'string' ||
    !authorization.toLowerCase().startsWith(API_KEY_SCHEME)
  ) {
    return undefined;
  }
  const [id] = Buffer.from(authorization.slice(API_KEY_SCHEME.length), 'base64')
    .toString()
    .split(':');
  return id.trim() === '' ? undefined : id;
};

export interface StableUserIdAuthUser {
  username?: string;
  profile_uid?: string;
  authentication_type?: string;
  authentication_realm?: { type?: string; name?: string };
}

/**
 * Builds a stable principal id for ownership checks.
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
  request,
  esClient,
}: {
  request: KibanaRequest;
  esClient: ElasticsearchClient;
}): Promise<string | undefined> => {
  const id = apiKeyIdFromAuthorization(request.headers.authorization);
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

const ADMIN_PRIVILEGE = 'agent_builder:admin'; // intentionally unregistered privilege

/**
 * Returns `true` only for users with wildcard Elasticsearch privileges (for example `superuser`).
 *
 * We intentionally check an application privilege name that is not registered by Kibana
 * (`agent_builder:admin`). Because this privilege is unregistered, normal roles fail this check,
 * while wildcard roles (for example application/cluster `*`/`all`) pass.
 *
 * This is used as an internal admin check, independent of feature/sub-feature grants.
 */
export const isAdminFromRequest = async ({
  esClient,
}: {
  esClient: ElasticsearchClient;
}): Promise<boolean> => {
  try {
    const { has_all_requested: isAdmin } = await esClient.security.hasPrivileges({
      application: [
        {
          application: KIBANA_APPLICATION,
          resources: ['*'],
          privileges: [ADMIN_PRIVILEGE],
        },
      ],
    });

    return isAdmin;
  } catch {
    return false;
  }
};
