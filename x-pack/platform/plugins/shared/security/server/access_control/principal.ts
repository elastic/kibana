/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Principal } from '@kbn/access-control';
import type { IClusterClient, KibanaRequest, Logger } from '@kbn/core/server';
import type { AuthenticatedPrincipal } from '@kbn/core-security-common';
import { extractApiKeyIdFromAuthzHeader } from '@kbn/core-security-server';

import { getDetailedErrorMessage, getErrorStatusCode } from '../errors';

export interface ResolvePrincipalParams {
  request: KibanaRequest;
  clusterClient: IClusterClient;
  /** Classifies the credential that authenticated the request. */
  getAuthenticatedPrincipal: (request: KibanaRequest) => AuthenticatedPrincipal | null;
  /** Resolves the profile of the user behind a session, Basic credentials, or an API key. */
  getCurrentProfileId: (request: KibanaRequest) => Promise<string | null>;
  logger: Logger;
}

/**
 * Resolves the principal the request's credential acts as, for matching against ACLs. It is always
 * the identity Elasticsearch authenticates, never a label such as the user who initiated a
 * background task.
 *
 * Returns `undefined` when the request has no principal that can own objects or receive grants:
 * unauthenticated and anonymous requests, and credentials whose creator cannot be resolved yet.
 * Throws when a lookup fails, so that a transient error never looks like a missing principal.
 */
export const resolvePrincipal = async ({
  request,
  clusterClient,
  getAuthenticatedPrincipal,
  getCurrentProfileId,
  logger,
}: ResolvePrincipalParams): Promise<Principal | undefined> => {
  if (!request.isFakeRequest && request.auth.isAuthenticated === false) {
    return;
  }

  const authenticatedPrincipal = getAuthenticatedPrincipal(request);
  if (authenticatedPrincipal?.type === 'anonymous') {
    return;
  }

  if (authenticatedPrincipal?.type === 'service_account') {
    return { type: 'service_account', id: authenticatedPrincipal.serviceAccountId };
  }

  // shortcut: a UIAM API key cannot be matched to the user who created it until
  // https://github.com/elastic/kibana/issues/271760 is resolved, so it only gets general access.
  if (authenticatedPrincipal?.type === 'api_key' && authenticatedPrincipal.variant === 'uiam') {
    return;
  }

  // Background tasks run on fake requests that carry the API key they execute with. The user
  // attached to such a request only describes who initiated the work, so the principal is the
  // creator of the key itself. The same applies to any request authenticated with a Stack API key.
  const apiKeyId = extractApiKeyIdFromAuthzHeader(request.headers.authorization);
  if (apiKeyId) {
    return await resolveApiKeyCreator({ request, clusterClient, apiKeyId, logger });
  }

  if (request.isFakeRequest) {
    return;
  }

  const profileId = await getCurrentProfileId(request);
  return profileId ? { type: 'user', id: profileId } : undefined;
};

/**
 * Reads the creator's profile from the API key record. An API key can always read its own record,
 * so this works for keys with limited privileges too.
 */
const resolveApiKeyCreator = async ({
  request,
  clusterClient,
  apiKeyId,
  logger,
}: {
  request: KibanaRequest;
  clusterClient: IClusterClient;
  apiKeyId: string;
  logger: Logger;
}): Promise<Principal | undefined> => {
  try {
    const { api_keys: apiKeys } = await clusterClient
      .asScoped(request)
      .asCurrentUser.security.getApiKey({ id: apiKeyId, with_profile_uid: true });
    const profileId = apiKeys[0]?.profile_uid;
    return profileId ? { type: 'user', id: profileId } : undefined;
  } catch (error) {
    // The key can no longer read itself, for example because it was invalidated: it has no principal.
    const statusCode = getErrorStatusCode(error);
    if (statusCode === 403 || statusCode === 404) {
      logger.debug(`API key creator cannot be resolved: ${getDetailedErrorMessage(error)}`);
      return;
    }
    throw error;
  }
};
