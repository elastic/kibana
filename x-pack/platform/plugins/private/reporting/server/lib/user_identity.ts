/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient, IClusterClient, KibanaRequest } from '@kbn/core/server';
import {
  decodeApiKeyId,
  HTTPAuthorizationHeader,
  isUiamCredential,
} from '@kbn/core-security-server';
import type { ReportingUser } from '../types';

const MAX_REALM_ID_LENGTH = 1024;

/** A stable, realm-aware identity for authorization checks on scheduled reports. */
export interface ReportingUserIdentity {
  /**
   * Every id this human may own documents under: a profile uid and a realm id are the same
   * principal. All of them are recorded when creating a document, because which ones a later
   * request can derive varies -- a run-as request, for instance, never carries a profile uid.
   */
  ids: string[];
  /** Set for API-key auth. A key owns only what it created, so it is matched separately from `ids`. */
  apiKeyId?: string;
  /** Display, logging, and matching documents created before ids existed. */
  username?: string;
}

interface StableUserIdAuthUser extends ApiKeyAuthUser {
  username?: string;
  profile_uid?: string;
  authentication_type?: string;
  lookup_realm?: { type?: string; name?: string };
}

interface ApiKeyAuthUser {
  api_key?: { id?: string; managed_by?: string };
}

interface ApiKeyOwner {
  profileUid?: string;
  realmType?: string;
  realmName?: string;
  username?: string;
}

interface ApiKeyContext {
  id?: string;
  /** UIAM keys have no Elasticsearch counterpart, so their creator cannot be looked up. */
  isUiam: boolean;
}

// Derived bearer tokens retain the key descriptor and synthetic lookup realm. Run-as requests
// instead have the effective human's lookup realm and no key descriptor, even with API-key auth.
const isApiKeyPrincipal = ({
  api_key: apiKey,
  lookup_realm: realm,
}: StableUserIdAuthUser): boolean =>
  apiKey !== undefined || realm?.type === '_es_api_key' || realm?.type === '_cloud_api_key';

/**
 * Elasticsearch reports the key id on the authenticated user for both Elasticsearch- and
 * Cloud-managed keys; decoding the authorization header is a fallback for the former only.
 */
const getApiKeyContext = ({
  user,
  request,
}: {
  user: ApiKeyAuthUser;
  request: KibanaRequest;
}): ApiKeyContext => {
  const authzHeader = HTTPAuthorizationHeader.parseFromRequest(request);
  const isUiam = user.api_key?.managed_by === 'cloud' || isUiamCredential(authzHeader ?? '');

  // `decodeApiKeyId` assumes `base64(id:secret)`. A UIAM credential is a raw secret with no id
  // envelope, so decoding one yields binary noise rather than an id.
  const idFromHeader =
    !isUiam && authzHeader?.scheme.toLowerCase() === 'apikey'
      ? decodeApiKeyId(authzHeader.credentials)
      : undefined;

  return { id: user.api_key?.id ?? idFromHeader, isUiam };
};

/**
 * Resolves the creator of an Elasticsearch API key, when available.
 *
 * API-key auth often omits `profile_uid` and reports the same synthetic `_es_api_key` realm for
 * every key, so the creator can only be recovered from the key itself.
 */
export const resolveApiKeyOwner = async ({
  id,
  esClient,
}: {
  id: string;
  esClient: ElasticsearchClient;
}): Promise<ApiKeyOwner | undefined> => {
  try {
    const response = await esClient.security.getApiKey({ with_profile_uid: true, id });
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
 * Usernames are not unique across authentication realms (e.g. file vs native), so realm type and
 * name are encoded with them. The `realm:` prefix keeps these distinguishable from profile uids.
 */
const toRealmId = (
  realmType: string | undefined,
  realmName: string | undefined,
  username: string | undefined
): string | undefined => {
  if (!realmType || !realmName || !username) {
    return undefined;
  }

  const realmId = `realm:${JSON.stringify([realmType, realmName, username])}`;
  if (realmId.length <= MAX_REALM_ID_LENGTH) {
    return realmId;
  }

  // An ID exceeding the mapping's ignore_above would look absent to the legacy ownership filter.
  return `realm:sha256:${createHash('sha256').update(realmId).digest('hex')}`;
};

/**
 * Builds every stable id the acting human may own documents under, preferred first.
 *
 * A principal resolves to a profile uid once they have an activated profile and to a realm id
 * otherwise, so documents created under either representation stay reachable.
 */
export const toStableUserIds = async ({
  authUser,
  resolveApiKeyOwner: resolveOwner,
}: {
  authUser: StableUserIdAuthUser;
  resolveApiKeyOwner?: () => Promise<ApiKeyOwner | undefined>;
}): Promise<string[]> => {
  const ids: Array<string | undefined> = [authUser.profile_uid];

  if (isApiKeyPrincipal(authUser)) {
    // The realm reported for API-key auth is shared by every key, so the creator's real realm can
    // only come from the key itself.
    const apiKeyOwner = await resolveOwner?.();
    ids.push(
      apiKeyOwner?.profileUid,
      toRealmId(apiKeyOwner?.realmType, apiKeyOwner?.realmName, apiKeyOwner?.username)
    );
  } else {
    // `lookup_realm`, not `authentication_realm`: the former is where `username` was resolved, the
    // latter is what authenticated the request. They differ when a proxy impersonates a user with
    // `es-security-runas-user`, and such requests never carry a profile uid, so they always reach
    // here.
    ids.push(
      toRealmId(authUser.lookup_realm?.type, authUser.lookup_realm?.name, authUser.username)
    );
  }

  return [...new Set(ids.filter((id): id is string => id !== undefined))];
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
    return { ids: [] };
  }

  const apiKey = isApiKeyPrincipal(user) ? getApiKeyContext({ user, request }) : undefined;

  let resolveOwner: (() => Promise<ApiKeyOwner | undefined>) | undefined;
  if (apiKey && !apiKey.isUiam) {
    const { id } = apiKey;
    if (id !== undefined) {
      resolveOwner = () =>
        resolveApiKeyOwner({ id, esClient: esClient.asScoped(request).asCurrentUser });
    }
  }

  const ids = await toStableUserIds({ authUser: user, resolveApiKeyOwner: resolveOwner });

  return { ids, apiKeyId: apiKey?.id, username: user.username };
};
