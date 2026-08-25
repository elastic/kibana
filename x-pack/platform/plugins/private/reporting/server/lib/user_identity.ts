/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, IClusterClient, KibanaRequest } from '@kbn/core/server';
import type { ReportingUser } from '../types';

/**
 * A stable, realm-aware identity for authorization checks on scheduled reports. Ownership
 * comparisons should prefer `id`; `username` is for display, logging, and matching saved objects
 * created before `id` existed.
 */
export interface ReportingUserIdentity {
  id?: string;
  username?: string;
}

interface StableUserIdAuthUser {
  username?: string;
  profile_uid?: string;
  authentication_type?: string;
  authentication_realm?: { type?: string; name?: string };
}

interface ApiKeyOwner {
  profileUid?: string;
  realmType?: string;
  realmName?: string;
  username?: string;
}

/**
 * Copied from `@kbn/core-security-server`, which does not export this on 9.3. Delete this copy and
 * import it once 9.3 is out of support.
 */
const extractApiKeyIdFromAuthzHeader = (
  authorizationHeader: string | string[] | undefined
): string | undefined => {
  if (typeof authorizationHeader !== 'string') {
    return undefined;
  }
  const prefix = 'apikey ';
  if (!authorizationHeader.toLowerCase().startsWith(prefix)) {
    return undefined;
  }
  const encodedApiKey = authorizationHeader.slice(prefix.length);
  const decoded = Buffer.from(encodedApiKey, 'base64').toString();
  const [id] = decoded.split(':');
  return id.trim() === '' ? undefined : id;
};

/**
 * Resolves the creator of an API key via Elasticsearch, when available.
 *
 * `getCurrentUser` for API-key auth often omits `profile_uid`, and reports the same synthetic
 * `_es_api_key` realm for every key, so neither can distinguish principals. Looking up the key
 * itself recovers the creator's profile uid, or failing that their real realm and username, so
 * ownership matches the creator's interactive sessions.
 */
export const resolveApiKeyOwner = async ({
  request,
  esClient,
}: {
  request: KibanaRequest;
  esClient: ElasticsearchClient;
}): Promise<ApiKeyOwner | undefined> => {
  const id = extractApiKeyIdFromAuthzHeader(request.headers.authorization);
  if (!id) {
    return undefined;
  }

  try {
    const response = await esClient.security.getApiKey({
      with_profile_uid: true,
      id,
    });
    const apiKey = response.api_keys?.[0];
    if (!apiKey) {
      return undefined;
    }

    return {
      profileUid: apiKey.profile_uid,
      realmType: apiKey.realm_type,
      realmName: apiKey.realm,
      username: apiKey.username,
    };
  } catch (error) {
    if (error instanceof errors.ResponseError && error.statusCode === 403) {
      return undefined;
    }
    throw error;
  }
};

/**
 * Builds a stable principal id for scheduled-report ownership checks.
 *
 * Usernames alone are not unique across Elasticsearch authentication realms (e.g. file vs
 * native). Prefer the Kibana user profile uid when present; otherwise encode realm type/name
 * with the username so same-username principals in different realms remain distinct.
 *
 * The `realm:` prefix keeps synthetic ids distinguishable from profile uids.
 */
export const toStableUserId = async ({
  authUser,
  resolveApiKeyOwner: resolveOwner,
}: {
  authUser: StableUserIdAuthUser;
  resolveApiKeyOwner?: () => Promise<ApiKeyOwner | undefined>;
}): Promise<string | undefined> => {
  const isApiKey = authUser.authentication_type === 'api_key';

  if (authUser.profile_uid) {
    return authUser.profile_uid;
  }

  if (isApiKey) {
    const apiKeyOwner = await resolveOwner?.();
    if (!apiKeyOwner) {
      return undefined;
    }
    if (apiKeyOwner.profileUid) {
      return apiKeyOwner.profileUid;
    }
    if (apiKeyOwner.realmType && apiKeyOwner.realmName && apiKeyOwner.username) {
      return `realm:${JSON.stringify([
        apiKeyOwner.realmType,
        apiKeyOwner.realmName,
        apiKeyOwner.username,
      ])}`;
    }
    return undefined;
  }

  const realmType = authUser.authentication_realm?.type;
  const realmName = authUser.authentication_realm?.name;
  const { username } = authUser;
  if (!realmType || !realmName || !username) {
    return undefined;
  }

  return `realm:${JSON.stringify([realmType, realmName, username])}`;
};

/**
 * Resolves the acting principal's identity for a request. Not cached: for API-key auth this
 * queries Elasticsearch, so callers making repeated ownership checks should resolve it once.
 */
export const getReportingUserIdentity = async ({
  user,
  request,
  esClient,
}: {
  user: ReportingUser;
  request: KibanaRequest;
  esClient: IClusterClient;
}): Promise<ReportingUserIdentity> => {
  if (!user) {
    return {};
  }

  const id = await toStableUserId({
    authUser: user,
    resolveApiKeyOwner: () =>
      resolveApiKeyOwner({ request, esClient: esClient.asScoped(request).asCurrentUser }),
  });

  return { id, username: user.username };
};
