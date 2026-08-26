/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest, Headers, KibanaRequest, Logger } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { brandSpaceId, DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

/**
 * When the ES client reports a 401 for a service-account-bound fake request, a token minted within
 * this window is retried as-is instead of minting again: the failure most likely came from a
 * scoped client still holding the previous token. Also acts as the anti-storm guard — a token
 * that keeps failing right after minting is never re-minted in a tight loop.
 */
export const SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS = 10_000;

/**
 * After a mint fails (e.g. the service account was revoked), further mint attempts are suppressed
 * for this long so a hot caller loop cannot hammer UIAM with doomed exchange requests.
 */
export const SERVICE_ACCOUNT_MINT_FAILURE_BACKOFF_MS = 5_000;

/**
 * Default lease on a service account bound fake request: how long transparent credential
 * replacement stays available after minting the request. Without a lease, reactive re-minting
 * would turn UIAM's five-minute ephemeral token into a permanent credential — a request that
 * leaks out of its workload (stored on a singleton, captured in a closure) would keep working
 * until the service account itself is revoked. Once the lease expires, refresh fails closed and
 * a leaked request degrades to the remainder of its current token. Generous by design: it must
 * outlive a workload execution (task-timeout order of magnitude), not a token.
 *
 * This cap is the forward-compatible interim for the operation-binding model, where the lease
 * becomes an explicit execution bracket plus a binding-existence re-check on every mint.
 */
export const SERVICE_ACCOUNT_REQUEST_MAX_LIFETIME_MS = 60 * 60 * 1000;

/**
 * Wraps a credential mint for a service account bound fake request. The interceptor decides
 * whether minting may proceed (throw to refuse — e.g. when a workload binding no longer exists)
 * and observes the outcome; it must call `mint` at most once and return its result.
 */
export type ServiceAccountMintInterceptor = (mint: () => Promise<string>) => Promise<string>;

export interface CreateServiceAccountFakeRequestParams {
  /** The ID of the service account the request should be bound to. */
  serviceAccountId: string;
  /** The space the request is scoped to. Defaults to the default space. */
  spaceId?: string;
  /**
   * How long transparent credential replacement stays available for this request. Defaults to
   * {@link SERVICE_ACCOUNT_REQUEST_MAX_LIFETIME_MS}; size it to the expected workload duration.
   */
  maxLifetimeMs?: number;
  /**
   * Wraps every credential mint for this request — the initial one included. Interceptor
   * failures are treated exactly like mint failures: propagated to the caller and, on refresh,
   * subject to the mint-failure backoff.
   */
  mintInterceptor?: ServiceAccountMintInterceptor;
}

interface ServiceAccountFakeRequestEntry {
  serviceAccountId: string;
  token: string;
  createdAt: number;
  maxLifetimeMs: number;
  mintedAt: number;
  /** Single-flight mint: concurrent refreshes await the same exchange instead of stampeding UIAM. */
  inflight?: Promise<string>;
  lastFailedMintAt?: number;
  mintInterceptor?: ServiceAccountMintInterceptor;
}

/**
 * Mints fake `KibanaRequest`s bound to a service account credential and keeps track of them so the
 * credential can be transparently replaced when it expires. The registry is the only writer of a
 * bound request's `authorization` header: fake-request headers share the `FakeRawRequest.headers`
 * object and are intentionally mutable, so an in-place update is picked up by every subsequent
 * `asScoped(...)` and self-client call.
 *
 * Two invariants that must hold against neighboring request-bound mechanisms:
 *
 * - Service-account-bound requests are mutually exclusive with fake requests marked via
 *   `markExternalUiamCredential` (external, user-created UIAM credentials): external credentials
 *   are user-owned, must not be vouched for with Kibana's client authentication, and can never be
 *   re-minted. Everything in this registry is Kibana-minted and self-healing — the opposite in
 *   both respects.
 * - Unlike the external-credential marker (and `fake_request_enrichment`), this registry must NOT
 *   guard against `authorization` changing after registration: replacing that header is this
 *   registry's very purpose, and it is the sole intended writer.
 *
 * Real inbound requests that happen to carry a service account token (a credential some other
 * service exchanged for itself) are unrelated to this registry: they are never registered, never
 * refreshed, and their credential lifecycle belongs to whoever minted it.
 */
export class ServiceAccountFakeRequests {
  private readonly registry = new WeakMap<KibanaRequest, ServiceAccountFakeRequestEntry>();

  constructor(
    private readonly logger: Logger,
    private readonly mintToken: (serviceAccountId: string) => Promise<string>
  ) {}

  async create({
    serviceAccountId,
    spaceId,
    maxLifetimeMs = SERVICE_ACCOUNT_REQUEST_MAX_LIFETIME_MS,
    mintInterceptor,
  }: CreateServiceAccountFakeRequestParams): Promise<KibanaRequest> {
    const token = await this.mintWithInterceptor(serviceAccountId, mintInterceptor);

    // The lowercase `authorization` key is load-bearing: the ES client derives a fake request's
    // credential by picking exact lowercased keys off its headers, so any other casing would
    // silently strip authentication entirely.
    const headers: Headers = { authorization: `Bearer ${token}` };
    const fakeRawRequest: FakeRawRequest = {
      headers,
      spaceId: brandSpaceId(spaceId ?? DEFAULT_SPACE_ID),
      // The request carries a credential Kibana itself minted. Without this flag the capabilities
      // switcher treats the request as unauthenticated and disables every capability.
      auth: { isAuthenticated: true },
    };

    const request = kibanaRequestFactory(fakeRawRequest);
    const now = Date.now();
    this.registry.set(request, {
      serviceAccountId,
      token,
      createdAt: now,
      maxLifetimeMs,
      mintedAt: now,
      mintInterceptor,
    });

    this.logger.debug('Created a service account bound fake request');
    return request;
  }

  isServiceAccountRequest(request: KibanaRequest): boolean {
    return this.registry.has(request);
  }

  /**
   * Returns a token no older than `maxAgeMs` for the service account bound to this request. When
   * the current token is older, a replacement is minted (single-flight) and the request's
   * `authorization` header is updated in place. Throws when the request is not bound to a service
   * account, when its lease has expired, when minting fails, or while mint failures are being
   * backed off.
   */
  async ensureFreshToken(request: KibanaRequest, maxAgeMs: number): Promise<string> {
    const entry = this.registry.get(request);
    if (!entry) {
      throw new Error('The provided request is not bound to a service account.');
    }

    // The lease fails closed: past it, the request rides out its current token and nothing more.
    if (Date.now() - entry.createdAt > entry.maxLifetimeMs) {
      throw new Error(
        'The lease on this service account bound request has expired; refusing to mint a replacement credential.'
      );
    }

    if (entry.inflight) {
      return await entry.inflight;
    }

    const now = Date.now();
    if (now - entry.mintedAt < maxAgeMs) {
      return entry.token;
    }

    if (
      entry.lastFailedMintAt !== undefined &&
      now - entry.lastFailedMintAt < SERVICE_ACCOUNT_MINT_FAILURE_BACKOFF_MS
    ) {
      throw new Error(
        'A recent attempt to mint a service account token failed; refusing to retry yet.'
      );
    }

    entry.inflight = this.mintWithInterceptor(entry.serviceAccountId, entry.mintInterceptor)
      .then((token) => {
        // A release() while the mint was in flight wins: the request is no longer ours to
        // refresh, so its header stays untouched. Callers already awaiting this mint still
        // receive the token they asked for.
        if (this.registry.get(request) === entry) {
          (request.headers as Record<string, string>).authorization = `Bearer ${token}`;
          entry.token = token;
          entry.mintedAt = Date.now();
          entry.lastFailedMintAt = undefined;
          this.logger.debug('Replaced the token of a service account bound fake request');
        }
        return token;
      })
      .catch((err) => {
        entry.lastFailedMintAt = Date.now();
        throw err;
      })
      .finally(() => {
        entry.inflight = undefined;
      });

    return await entry.inflight;
  }

  /**
   * Drops the request from the registry: transparent credential replacement is permanently
   * disabled and the request rides out the remainder of its current token. Idempotent; returns
   * whether the request was registered.
   */
  release(request: KibanaRequest): boolean {
    const released = this.registry.delete(request);
    if (released) {
      this.logger.debug('Released a service account bound fake request');
    }
    return released;
  }

  private mintWithInterceptor(
    serviceAccountId: string,
    mintInterceptor?: ServiceAccountMintInterceptor
  ): Promise<string> {
    const mint = () => this.mintToken(serviceAccountId);
    return mintInterceptor ? mintInterceptor(mint) : mint();
  }
}
