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

export interface ReportingUserIdentity {
  /** Store all IDs so requests without a profile UID (such as run-as) retain access. */
  ids: string[];
  /** Restricts a key to reports it created, even when its owner's IDs match other reports. */
  apiKeyId?: string;
  /** For display and logging only; usernames are not unique across realms. */
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

// Authentication type alone misses key-derived tokens and misclassifies API-key run-as requests.
const isApiKeyPrincipal = ({
  api_key: apiKey,
  lookup_realm: realm,
}: StableUserIdAuthUser): boolean =>
  apiKey !== undefined || realm?.type === '_es_api_key' || realm?.type === '_cloud_api_key';

const getApiKeyContext = ({
  user,
  request,
}: {
  user: ApiKeyAuthUser;
  request: KibanaRequest;
}): ApiKeyContext => {
  const authzHeader = HTTPAuthorizationHeader.parseFromRequest(request);
  const isUiam = user.api_key?.managed_by === 'cloud' || isUiamCredential(authzHeader ?? '');

  // UIAM credentials are raw secrets, not base64(id:secret).
  const id =
    user.api_key?.id ??
    (!isUiam && authzHeader?.scheme.toLowerCase() === 'apikey'
      ? decodeApiKeyId(authzHeader.credentials)
      : undefined);

  return { id, isUiam };
};

/** Resolves the creator's identity, which API-key authentication may omit. */
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

  // Keep ownership IDs indexed so their creators can find the reports.
  return `realm:sha256:${createHash('sha256').update(realmId).digest('hex')}`;
};

/** Includes both identities so profile activation does not change report ownership. */
export const toStableUserIds = async ({
  authUser,
  resolveApiKeyOwner: resolveOwner,
}: {
  authUser: StableUserIdAuthUser;
  resolveApiKeyOwner?: () => Promise<ApiKeyOwner | undefined>;
}): Promise<string[]> => {
  const ids: Array<string | undefined> = [authUser.profile_uid];

  if (isApiKeyPrincipal(authUser)) {
    // API keys share a synthetic realm; ownership requires the creator's realm.
    const apiKeyOwner = await resolveOwner?.();
    ids.push(
      apiKeyOwner?.profileUid,
      toRealmId(apiKeyOwner?.realmType, apiKeyOwner?.realmName, apiKeyOwner?.username)
    );
  } else {
    // Run-as ownership follows the impersonated user's lookup realm, not the authenticator's realm.
    ids.push(
      toRealmId(authUser.lookup_realm?.type, authUser.lookup_realm?.name, authUser.username)
    );
  }

  return [...new Set(ids.filter((id): id is string => id !== undefined))];
};

/** May query Elasticsearch for API-key ownership; callers should reuse the result per request. */
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
