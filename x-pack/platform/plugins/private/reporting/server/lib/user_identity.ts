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
 * A stable, realm-aware identity for authorization checks on scheduled reports.
 *
 * `ids` holds every id the acting human may legitimately own documents under. A user profile uid
 * and a realm-qualified id denote the same principal, and which one a document stores depends on
 * what was resolvable when it was created, so ownership must match against all of them. `id` is
 * the preferred one, written when creating a document.
 *
 * `apiKeyId` is set when the request is authenticated with an API key. A key owns only the
 * documents it created, never the rest of its creator's, so it is matched separately from `ids`.
 *
 * `username` is for display, logging, and matching documents created before ids existed.
 */
export interface ReportingUserIdentity {
  id?: string;
  ids: string[];
  apiKeyId?: string;
  username?: string;
}

interface StableUserIdAuthUser {
  username?: string;
  profile_uid?: string;
  authentication_type?: string;
  authentication_realm?: { type?: string; name?: string };
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

/**
 * Identifies UIAM (Elastic Cloud) credentials. Copied from `@kbn/core-security-server`, which does
 * not export `isUiamCredential` on 9.3. Delete this copy and import it once 9.3 is out of support.
 */
const UIAM_CREDENTIALS_PREFIX = 'essu_';

const extractApiKeyCredentialsFromAuthzHeader = (
  authorizationHeader: string | string[] | undefined
): string | undefined => {
  if (typeof authorizationHeader !== 'string') {
    return undefined;
  }
  const prefix = 'apikey ';
  if (!authorizationHeader.toLowerCase().startsWith(prefix)) {
    return undefined;
  }
  return authorizationHeader.slice(prefix.length);
};

/**
 * Copied from `@kbn/core-security-server`, which does not export this on 9.3. Delete this copy and
 * import it once 9.3 is out of support.
 *
 * Only valid for Elasticsearch API keys, which are sent as `base64(id:secret)`. A UIAM credential
 * is a raw secret with no id envelope, so decoding one yields binary noise rather than an id.
 */
const decodeApiKeyId = (encodedApiKey: string | undefined): string | undefined => {
  if (encodedApiKey === undefined) {
    return undefined;
  }
  const decoded = Buffer.from(encodedApiKey, 'base64').toString();
  const [id] = decoded.split(':');
  return id.trim() === '' ? undefined : id;
};

interface ApiKeyContext {
  id?: string;
  /**
   * UIAM keys are managed by Elastic Cloud and have no Elasticsearch counterpart, so their creator
   * cannot be looked up and documents they create are owned by the key alone.
   */
  isUiam: boolean;
}

/**
 * Describes the API key a request is authenticated with.
 *
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
  const credentials = extractApiKeyCredentialsFromAuthzHeader(request.headers.authorization);
  const isUiam =
    user.api_key?.managed_by === 'cloud' ||
    credentials?.startsWith(UIAM_CREDENTIALS_PREFIX) === true;

  return {
    id: user.api_key?.id ?? (isUiam ? undefined : decodeApiKeyId(credentials)),
    isUiam,
  };
};

/**
 * Resolves the creator of an Elasticsearch API key, when available.
 *
 * `getCurrentUser` for API-key auth often omits `profile_uid`, and reports the same synthetic
 * `_es_api_key` realm for every key, so neither can distinguish principals. Looking up the key
 * itself recovers the creator's profile uid, or failing that their real realm and username, so
 * ownership matches the creator's interactive sessions.
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
 * Usernames alone are not unique across Elasticsearch authentication realms (e.g. file vs native),
 * so realm type and name are encoded with the username. The `realm:` prefix keeps synthetic ids
 * distinguishable from profile uids.
 */
const toRealmId = (
  realmType: string | undefined,
  realmName: string | undefined,
  username: string | undefined
): string | undefined =>
  realmType && realmName && username
    ? `realm:${JSON.stringify([realmType, realmName, username])}`
    : undefined;

/**
 * Builds every stable principal id the acting human may own documents under, preferred first.
 *
 * A principal resolves to a profile uid once they have an activated profile and to a
 * realm-qualified id otherwise, so both are returned when both are derivable. Documents created
 * under either representation then remain accessible when the other is preferred later.
 */
export const toStableUserIds = async ({
  authUser,
  resolveApiKeyOwner: resolveOwner,
}: {
  authUser: StableUserIdAuthUser;
  resolveApiKeyOwner?: () => Promise<ApiKeyOwner | undefined>;
}): Promise<string[]> => {
  const ids: Array<string | undefined> = [authUser.profile_uid];

  if (authUser.authentication_type === 'api_key') {
    // The realm reported for API-key auth is synthetic and shared by every key, so the creator's
    // real realm can only come from the key itself.
    const apiKeyOwner = await resolveOwner?.();
    ids.push(
      apiKeyOwner?.profileUid,
      toRealmId(apiKeyOwner?.realmType, apiKeyOwner?.realmName, apiKeyOwner?.username)
    );
  } else {
    ids.push(
      toRealmId(
        authUser.authentication_realm?.type,
        authUser.authentication_realm?.name,
        authUser.username
      )
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

  const apiKey =
    user.authentication_type === 'api_key' ? getApiKeyContext({ user, request }) : undefined;

  let resolveOwner: (() => Promise<ApiKeyOwner | undefined>) | undefined;
  if (apiKey && !apiKey.isUiam) {
    const { id } = apiKey;
    if (id !== undefined) {
      resolveOwner = () =>
        resolveApiKeyOwner({ id, esClient: esClient.asScoped(request).asCurrentUser });
    }
  }

  const ids = await toStableUserIds({ authUser: user, resolveApiKeyOwner: resolveOwner });

  return { id: ids[0], ids, apiKeyId: apiKey?.id, username: user.username };
};
