/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';

/**
 * Resolves a key identifying the principal a request is authorized as,
 * or `undefined` when no such key can be derived.
 */
export type PrincipalKeyResolver = (request: KibanaRequest) => string | undefined;

/**
 * Creates a resolver deriving, without I/O, a key for the principal Elasticsearch authorizes a request as.
 *
 * Two requests sharing a key are expected to hold the same privileges, so the key follows the
 * credential rather than the user it acts for: an API key is a principal of its own.
 */
export const createPrincipalKeyResolver = ({
  security,
}: {
  security: SecurityServiceStart;
}): PrincipalKeyResolver => {
  // One listing evaluates many resources for the same request.
  const keysByRequest = new WeakMap<KibanaRequest, string | undefined>();

  return (request) => {
    if (keysByRequest.has(request)) {
      return keysByRequest.get(request);
    }
    const principalKey = resolvePrincipalKey({ request, security });
    keysByRequest.set(request, principalKey);
    return principalKey;
  };
};

const resolvePrincipalKey = ({
  request,
  security,
}: {
  request: KibanaRequest;
  security: SecurityServiceStart;
}): string | undefined => {
  const principal = security.authc.getPrincipal(request);

  if (!principal) {
    // A fake request that was not minted for a service account is authorized as the credential it
    // carries. The user `getCurrentUser` may return for it is the one it acts for, not its privileges.
    return request.isFakeRequest ? getCredentialKey(request) : undefined;
  }

  switch (principal.type) {
    case 'service_account':
      return `service_account:${principal.variant}:${principal.serviceAccountId}`;
    case 'api_key':
      return `api_key:${principal.variant}:${principal.apiKeyId}`;
    case 'anonymous':
      return `anonymous:${principal.username}`;
    case 'user':
      return principal.userProfileId
        ? `user:${principal.userProfileId}`
        : getRealmUserKey({ request, security });
  }
};

/**
 * Keys a request by a digest of its credential. The whole header is hashed rather than the
 * API key id decoded, because not every credential a fake request carries has a decodable id.
 */
const getCredentialKey = (request: KibanaRequest): string | undefined => {
  const { authorization } = request.headers;
  if (typeof authorization !== 'string' || authorization.length === 0) {
    return undefined;
  }
  return `credential:${createHash('sha256').update(authorization).digest('hex')}`;
};

/**
 * Usernames are only unique within a realm, so users without a profile are keyed by realm too.
 */
const getRealmUserKey = ({
  request,
  security,
}: {
  request: KibanaRequest;
  security: SecurityServiceStart;
}): string | undefined => {
  try {
    const user = security.authc.getCurrentUser(request);
    const realmType = user?.authentication_realm?.type;
    const realmName = user?.authentication_realm?.name;
    const username = user?.username;
    if (!realmType || !realmName || !username) {
      return undefined;
    }
    return `realm_user:${JSON.stringify([realmType, realmName, username])}`;
  } catch {
    // Reading the realm throws for minimally authenticated users.
    return undefined;
  }
};
