/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { AuthenticatedPrincipal } from '@kbn/core-security-common';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import type { Principal } from '@kbn/ols';

/**
 * The header a proxy sets to run a request as another user. The `Authorization` header then
 * belongs to the proxy, not to the user the request acts for.
 */
const RUN_AS_HEADER = 'es-security-runas-user';

/**
 * Everything `resolvePrincipal` needs to find who a request acts as.
 */
export interface ResolvePrincipalParams {
  /** The request to resolve. */
  request: KibanaRequest;
  /** Classifies the credential that authenticated the request. */
  getAuthenticatedPrincipal: (request: KibanaRequest) => AuthenticatedPrincipal | null;
  /**
   * Resolves the profile of the user who created the API key the request carries, Stack or UIAM.
   * Resolves `undefined` when no user created it or the key no longer reads itself, and throws
   * when the lookup fails for any other reason.
   */
  getApiKeyProfileId: (request: KibanaRequest) => Promise<string | undefined>;
  /** Resolves the profile of the user behind Basic credentials. */
  getCurrentProfileId: (request: KibanaRequest) => Promise<string | null>;
  /** Whether the request carries a Kibana session cookie. */
  hasSession: (request: KibanaRequest) => Promise<boolean>;
  /** Logger for lookups that find no principal. */
  logger: Logger;
}

/**
 * Finds the principal a request acts as: the user profile of a user or of the user who created an
 * API key, or a service account.
 *
 * @param params See {@link ResolvePrincipalParams}.
 * @returns The principal, or `undefined` when the request acts as nobody that can own or receive
 *   access: an anonymous user, a run-as request, an API key that no user created, Basic
 *   credentials sent with a session cookie, or a user without a profile.
 * @throws When the API key lookup fails for a reason other than the key being gone.
 */
export const resolvePrincipal = async ({
  request,
  getAuthenticatedPrincipal,
  getApiKeyProfileId,
  getCurrentProfileId,
  hasSession,
  logger,
}: ResolvePrincipalParams): Promise<Principal | undefined> => {
  if (!request.isFakeRequest && request.auth.isAuthenticated === false) {
    return;
  }

  // The `Authorization` header belongs to the proxy, and the user the request acts for has no
  // profile that can be trusted, as in the user profile service.
  if (request.headers[RUN_AS_HEADER]) {
    return;
  }

  const authenticatedPrincipal = getAuthenticatedPrincipal(request);
  if (authenticatedPrincipal?.type === 'anonymous') {
    return;
  }

  // Covers Stack and UIAM service accounts alike, including fake requests that a workload runs as
  // its bound service account.
  if (authenticatedPrincipal?.type === 'service_account') {
    return { type: 'service_account', id: authenticatedPrincipal.serviceAccountId };
  }

  // A session gives its user's profile ID directly. Only a session sets it: a request that also
  // carries an `Authorization` header is authenticated by the header, so it doesn't get here. The
  // user that a fake request carries only describes who initiated the work, so it never counts.
  if (
    !request.isFakeRequest &&
    authenticatedPrincipal?.type === 'user' &&
    authenticatedPrincipal.userProfileId
  ) {
    return { type: 'user', id: authenticatedPrincipal.userProfileId };
  }

  // An API key, Stack or UIAM, on a request or on the fake request a background task runs with:
  // the principal is the user who created the key.
  const authorization = HTTPAuthorizationHeader.parseFromRequest(request);
  if (authorization?.scheme.toLowerCase() === 'apikey') {
    const profileId = await getApiKeyProfileId(request);
    if (!profileId) {
      logger.debug(
        'No profile found for the creator of the API key the request carries: no user created it, the user has no profile yet, or the key is not searchable yet.'
      );
    }
    return profileId ? { type: 'user', id: profileId } : undefined;
  }

  if (request.isFakeRequest) {
    return;
  }

  // Basic credentials sent with a session cookie: the header authenticated the request, but the
  // profile lookup reads the session first, so its answer could name another user. The request gets
  // general access only.
  if (await hasSession(request)) {
    logger.debug('No principal for a request with both a session and an Authorization header.');
    return;
  }

  const profileId = await getCurrentProfileId(request);
  return profileId ? { type: 'user', id: profileId } : undefined;
};
