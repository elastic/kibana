/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { CreateServiceAccountParams, ServiceAccount } from '@kbn/core-security-server';

import type { ServiceAccountWorkloadBindingsApi } from './bindings';
import type { CreateServiceAccountFakeRequestParams } from './fake_requests';

/**
 * Query parameters for listing service accounts.
 */
export interface ListServiceAccountsParams {
  limit?: number;
  after?: string;
  q?: string;
}

/**
 * The principal that created a service account.
 */
export type ServiceAccountCreator =
  | {
      type: 'user';
      id: string;
      first_name?: string;
      last_name?: string;
    }
  | {
      type: 'api-key';
      id: string;
      description?: string;
    };

/**
 * A service account as returned by UIAM get and list. Richer than Core's create payload: UIAM
 * includes `creator`.
 */
export interface ListedServiceAccount extends ServiceAccount {
  creator: ServiceAccountCreator;
}

/**
 * Page of service accounts assumable by this Kibana. `after` is the continuation token when UIAM
 * has more results.
 */
export interface ListServiceAccountsResult {
  service_accounts: ListedServiceAccount[];
  after?: string;
}

/**
 * A backend capable of managing service accounts for the current runtime.
 *
 * Implemented once for UIAM-backed deployments and once for Elasticsearch-backed
 * ones, so the route and contract layers stay backend-agnostic.
 */
export interface ServiceAccountsBackend {
  create(request: KibanaRequest, params: CreateServiceAccountParams): Promise<ServiceAccount>;

  /**
   * POC ONLY. See {@link CoreServiceAccountsService.exchangeToken} for the full rationale and
   * the caveats that apply before this can ship.
   */
  exchangeToken(serviceAccountId: string): Promise<{ token: string }>;

  /**
   * Lists service accounts assumable by this Kibana. Not part of Core's consumer contract — Core
   * stays create-only; this exists so the security plugin can expose a directory over HTTP.
   *
   * The Kibana caller must hold `manage_security`. The UIAM call itself is authenticated as
   * Kibana (mTLS / shared secret), not as the user.
   */
  list(
    request: KibanaRequest,
    params?: ListServiceAccountsParams
  ): Promise<ListServiceAccountsResult>;

  /**
   * Fetches one service account by id. Not part of Core's consumer contract — Core stays
   * create-only; this exists so the security plugin can look up an account when list is
   * unavailable.
   *
   * The Kibana caller must hold `manage_security`. The UIAM call itself is authenticated as
   * Kibana (mTLS / shared secret), not as the user.
   */
  get(request: KibanaRequest, id: string): Promise<ListedServiceAccount>;

  /**
   * Mints a fake `KibanaRequest` bound to the given service account, for use with `asScoped(...)`
   * facilities. The credential is transparently replaced when it expires. Performs no user
   * authorization: callers must authorize their own users first.
   */
  createFakeRequest(params: CreateServiceAccountFakeRequestParams): Promise<KibanaRequest>;

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
export interface ServiceAccountsServiceStart extends ServiceAccountsBackend {
  /**
   * Workload binding management and execution. Consumed exclusively by the Core security
   * delegate, which reaches it through operation capability handles — it is deliberately absent
   * from the security plugin's own public contract, so no plugin can address a workload binding
   * without having claimed the operation type it belongs to.
   */
  workloads: ServiceAccountWorkloadBindingsApi;
}
