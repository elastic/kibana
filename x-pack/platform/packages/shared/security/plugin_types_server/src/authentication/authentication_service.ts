/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { NativeAPIKeysType } from '@kbn/core-security-server';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';

/**
 * Kibana's own identity as a principal in UIAM: the project service account UIAM derives from
 * Kibana's mTLS client certificate.
 */
export interface SystemIdentity {
  /**
   * Mints a short-lived, non-refreshable UIAM token that identifies this Kibana. Intended as the
   * bearer credential on cross-region requests to other Elastic services, where the destination
   * forwards it to UIAM together with Kibana's mTLS certificate identity.
   * The token is an internal credential: UIAM accepts it only together with Kibana's certificate
   * identity or Kibana's shared secret, neither of which leaves this process.
   *
   * Every call mints a fresh token; nothing is cached. Callers must not persist the token.
   *
   * @param signal Aborts the in-flight request to UIAM. A caller whose own request is already
   * cancelled should pass its signal so the mint does not outlive it.
   */
  createEphemeralToken(signal?: AbortSignal): Promise<string>;
}

/**
 * Authentication services available on the security plugin's start contract.
 */
export interface AuthenticationServiceStart {
  apiKeys: NativeAPIKeysType;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  /**
   * Kibana's own UIAM identity. `undefined` when UIAM is not configured for this deployment, or
   * when it is configured without the mTLS client certificate UIAM derives the identity from.
   */
  systemIdentity?: SystemIdentity;
}
