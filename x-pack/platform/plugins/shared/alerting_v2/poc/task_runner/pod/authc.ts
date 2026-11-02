/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pod identity resolution: instead of Kibana Core's full Security plugin (session cookies, SAML/
 * OIDC realms, role-mapping cache, audit logging), the pod resolves "who is running this task" by
 * calling Elasticsearch's own `_security/_authenticate` with the request's `Authorization` header
 * (the decrypted API key the poking service sent). This is real identity, not a stub — it is the
 * same call Kibana's own Security plugin ultimately makes for API-key-authenticated requests — but
 * none of Core's session/realm machinery is bundled.
 */
import type { Client } from '@elastic/elasticsearch';
import type { KibanaRequest } from '@kbn/core-http-server';

export interface PodAuthenticatedUser {
  readonly username: string;
  readonly profile_uid?: string;
}

const authenticate = async (
  client: Client,
  request: KibanaRequest
): Promise<PodAuthenticatedUser | null> => {
  const authorization = request.headers?.authorization;
  if (!authorization) return null;
  try {
    const scoped = client.child({ headers: { authorization: authorization as string } });
    const response = await scoped.security.authenticate();
    return { username: response.username };
  } catch {
    // Expired/invalid API key, or security disabled on this cluster: treated as anonymous, same
    // as the real `security.authc.getCurrentUser` returning `null`.
    return null;
  }
};

/**
 * `CoreStart('security')` shape `UserService` reads: only `authc.getCurrentUser`.
 */
export const buildSecurityStart = (client: Client) => ({
  authc: {
    getCurrentUser: (request: KibanaRequest) => authenticate(client, request),
  },
});

/**
 * `CoreStart('userProfile')` shape `UserService` reads: only `getCurrentProfileId`. API-key-
 * authenticated requests have no activated user profile in real Kibana either, so this honestly
 * returns `null` rather than inventing a profile uid.
 */
export const buildUserProfileStart = (_client: Client) => ({
  getCurrentProfileId: async (_opts: { request: KibanaRequest }) => null,
});
