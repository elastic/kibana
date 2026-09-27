/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type {
  CreateServiceAccountParams,
  ServiceAccount,
  UiamProjectType,
} from '@kbn/core-security-server';

import type { ServiceAccountWorkloadBindingsApi } from './bindings';
import type { CreateServiceAccountFakeRequestParams } from './fake_requests';
import type {
  ListServiceAccountsResponse,
  ServiceAccountDirectoryEntry,
} from '../../common/service_accounts';

/**
 * Paging parameters for listing service accounts. `after` is the `next_page` cursor of the
 * previous page, opaque to the caller and specific to the backend that issued it.
 */
export interface ListServiceAccountsParams {
  limit?: number;
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
   * Lists the service accounts this Kibana can see, one page at a time.
   *
   * Authorizes the Kibana caller first. On UIAM the outbound call is then authenticated as Kibana
   * over mTLS, not as the user.
   */
  list(
    request: KibanaRequest,
    params?: ListServiceAccountsParams
  ): Promise<ListServiceAccountsResponse>;

  /**
   * Fetches one service account by id, with the same authorization model as {@link list}.
   */
  get(request: KibanaRequest, id: string): Promise<ServiceAccountDirectoryEntry>;

  /**
   * Mints a fake `KibanaRequest` bound to the given service account, for use with `asScoped(...)`
   * facilities. The credential is transparently replaced after an Elasticsearch token-expiry
   * failure, within the configured
   * `xpack.security.serviceAccounts.requestLifetime`. Already-issued tokens keep their upstream
   * expiration. Kibana self-client calls do not yet trigger renewal (#290877).
   * Performs no user authorization: callers must authorize their own users first.
   */
  createFakeRequest(params: CreateServiceAccountFakeRequestParams): Promise<KibanaRequest>;

  /**
   * Replaces the credential of a service-account-bound fake request after a 401 was attributed to
   * an expired token, returning the auth headers to retry with, or `null` when the request is not
   * bound to a service account or a replacement could not be minted. Only meant to be called by
   * the two unauthorized-error handlers that own a retry: the Elasticsearch client's, and Core's
   * HTTP self client's.
   *
   * The result is credential-only by design. The Elasticsearch client merges it into the headers
   * it sends upstream, so nothing that must not reach Elasticsearch — notably the UIAM
   * internal-caller attestation — belongs here. The self client derives that itself, per attempt,
   * from whichever credential it is about to send.
   *
   * Only requests minted by this backend are ever refreshed. Fake requests carrying external
   * (user-created) UIAM credentials and real inbound requests that happen to carry a service
   * account token both resolve to `null`: their credentials are owned by someone else and are not
   * Kibana's to re-mint.
   */
  reauthenticateFakeRequest(request: KibanaRequest): Promise<{ authorization: string } | null>;

  /**
   * Drops a fake request from the refresh registry: transparent credential replacement is
   * permanently disabled and its authorization header is removed. Copies of the issued token
   * remain valid until upstream expiry; release does not remotely invalidate them. Idempotent,
   * and a no-op for requests this backend did not mint.
   */
  releaseFakeRequest(request: KibanaRequest): void;
}

/**
 * Start contract of the service accounts service. `null` when the feature is
 * disabled.
 */
export interface ServiceAccountsServiceStart {
  /** Service account management and credential minting for this deployment's backend. */
  backend: ServiceAccountsBackend;

  /**
   * Workload binding management and execution. Consumed exclusively by the Core security
   * delegate, which scopes every call to the plugin Core identified as the caller.
   */
  workloads: ServiceAccountWorkloadBindingsApi;
}

export interface CloudProjectContext {
  organizationId: string;
  projectId: string;
  projectType: UiamProjectType;
}
