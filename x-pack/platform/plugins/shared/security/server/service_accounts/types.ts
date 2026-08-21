/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { CreateServiceAccountParams, ServiceAccount } from '@kbn/core-security-server';

import type { CreateServiceAccountFakeRequestParams } from './fake_requests';

/**
 * A backend capable of managing service accounts for the current runtime.
 *
 * Implemented once for UIAM-backed deployments and once for Elasticsearch-backed
 * ones, so the route and contract layers stay backend-agnostic.
 */
export interface ServiceAccountsBackend {
  create(request: KibanaRequest, params: CreateServiceAccountParams): Promise<ServiceAccount>;

  /**
   * Mints a fake `KibanaRequest` bound to the given service account, for use with `asScoped(...)`
   * facilities. The credential is transparently replaced when it expires. Performs no user
   * authorization: callers must authorize their own users first.
   */
  createFakeRequest(params: CreateServiceAccountFakeRequestParams): Promise<KibanaRequest>;

  /**
   * Returns the headers a trusted loopback caller stamps on a real HTTP request to Kibana's own
   * APIs, made as the given service account: a freshly minted `authorization` header plus the
   * internal caller attestation the receiving side requires. A new ephemeral credential is minted
   * on every call — read right before the loopback call and never persist the result. Independent
   * of any fake request: the fake-request credential lifecycle (reactive re-mint on ES 401s) and
   * the loopback credential (proactive mint per call) are deliberately separate concerns.
   */
  getLoopbackAuthHeaders(serviceAccountId: string): Promise<Record<string, string>>;

  /**
   * Replaces the credential of a service-account-bound fake request after the ES client reported
   * a 401 for it, returning the auth headers to retry with, or `null` when the request is not
   * bound to a service account or a replacement could not be minted. Only meant to be called by
   * the ES-client unauthorized-error handler.
   *
   * Only requests minted by this backend are ever refreshed. Fake requests carrying external
   * (user-created) UIAM credentials and real inbound requests that happen to carry a service
   * account token both resolve to `null`: their credentials are owned by someone else and are not
   * Kibana's to re-mint.
   */
  reauthenticateFakeRequest(request: KibanaRequest): Promise<{ authorization: string } | null>;

  /**
   * Drops a fake request from the refresh registry: transparent credential replacement is
   * permanently disabled and the request rides out the remainder of its current short-lived
   * token. Idempotent, and a no-op for requests this backend did not mint.
   */
  releaseFakeRequest(request: KibanaRequest): void;
}

/**
 * Start contract of the service accounts service. `null` when the feature is
 * disabled, mirroring how OAuth management is exposed.
 */
export type ServiceAccountsServiceStart = ServiceAccountsBackend;
