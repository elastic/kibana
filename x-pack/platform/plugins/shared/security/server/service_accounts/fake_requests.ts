/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { FakeRawRequest, Headers, KibanaRequest, Logger } from '@kbn/core/server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { brandSpaceId, DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import { ServiceAccountTokenExchangeError } from './token_exchange_error';

/**
 * When the ES client reports a 401 for a service-account-bound fake request, a token minted within
 * this window is retried as-is instead of minting again: the failure most likely came from a
 * scoped client still holding the previous token. Also acts as the anti-storm guard — a token
 * that keeps failing right after minting is never re-minted in a tight loop.
 */
export const SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS = 10_000;

/**
 * After a transient mint failure, further mint attempts are suppressed
 * for this long so a hot caller loop cannot hammer UIAM with doomed exchange requests.
 */
export const SERVICE_ACCOUNT_MINT_FAILURE_BACKOFF_MS = 5_000;

/**
 * Wraps a credential mint for a service account bound fake request. The interceptor decides
 * whether minting may proceed and observes the outcome; it must call `mint` at most once and
 * return its result.
 *
 * To refuse, throw a client error (a `Boom` with a 4xx status, e.g. when a workload binding no
 * longer exists): a refusal is terminal for the request, and the interceptor is never consulted
 * again. Any other error is treated as a transient failure of the check itself, and minting is
 * retried after the mint-failure backoff.
 */
export type ServiceAccountMintInterceptor = (mint: () => Promise<string>) => Promise<string>;

export interface CreateServiceAccountFakeRequestParams {
  /** The ID of the service account the request should be bound to. */
  serviceAccountId: string;
  /** The space the request is scoped to. Defaults to the default space. */
  spaceId?: string;
  /**
   * How long transparent credential replacement stays available for this request. Defaults to the
   * configured `xpack.security.serviceAccounts.requestLifetime`; size it to the expected workload
   * duration, or pass `Number.POSITIVE_INFINITY` when a `mintInterceptor` gates minting on a
   * stricter, revocable condition instead.
   */
  maxLifetimeMs?: number;
  /**
   * Wraps every credential mint for this request — the initial one included. Interceptor
   * failures are propagated to the caller; on refresh, a refusal (4xx) is terminal and any other
   * failure is subject to the mint-failure backoff. See {@link ServiceAccountMintInterceptor}.
   */
  mintInterceptor?: ServiceAccountMintInterceptor;
}

/**
 * Decides whether a failed mint permanently disables credential replacement for its request.
 *
 * The exchange reports its own retryability, and anything else it throws is unexpected and fails
 * closed. A failure raised by the mint interceptor instead is read differently: a client error is
 * a deliberate refusal (the workload is unbound, was re-bound, or its binding failed
 * verification), while a server error or a plain exception is a failure of the check itself — a
 * saved objects read against a briefly unavailable cluster, say — that the next refresh may not
 * hit again. Latching those would kill a still-valid execution over one blip.
 */
const isTerminalMintFailure = (
  err: unknown,
  { raisedByInterceptor }: { raisedByInterceptor: boolean }
): boolean => {
  if (err instanceof ServiceAccountTokenExchangeError) {
    return !err.retryable;
  }

  if (!raisedByInterceptor) {
    return true;
  }

  if (Boom.isBoom(err)) {
    const { statusCode } = err.output;
    // Too Many Requests is the one client error that describes the moment, not the request.
    return statusCode >= 400 && statusCode < 500 && statusCode !== 429;
  }

  return false;
};

interface ServiceAccountFakeRequestEntry {
  serviceAccountId: string;
  token: string;
  createdAt: number;
  mintedAt: number;
  /** Single-flight mint: concurrent refreshes await the same exchange instead of stampeding UIAM. */
  inflight?: Promise<string>;
  retryAt?: number;
  nonRetryableError?: Error;
  maxLifetimeMs: number;
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
    private readonly mintToken: (serviceAccountId: string) => Promise<string>,
    private readonly requestLifetimeMs: number
  ) {}

  async create({
    serviceAccountId,
    spaceId,
    maxLifetimeMs,
    mintInterceptor,
  }: CreateServiceAccountFakeRequestParams): Promise<KibanaRequest> {
    if (maxLifetimeMs !== undefined && !(maxLifetimeMs > 0)) {
      throw new Error(
        `The lifetime of a service account bound request must be a positive number of milliseconds, but got ${maxLifetimeMs}.`
      );
    }

    // The configured lifetime is the only bound on how long a credential keeps renewing itself.
    // Waiving it is only safe when something stricter takes its place.
    if (maxLifetimeMs !== undefined && !Number.isFinite(maxLifetimeMs) && !mintInterceptor) {
      throw new Error(
        'A service account bound request without a lifetime must have a mint interceptor gating every mint.'
      );
    }

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
      mintedAt: now,
      maxLifetimeMs: maxLifetimeMs ?? this.requestLifetimeMs,
      mintInterceptor,
    });

    this.logger.debug(`Created a fake request bound to service account ${serviceAccountId}`);
    return request;
  }

  isServiceAccountRequest(request: KibanaRequest): boolean {
    return this.registry.has(request);
  }

  /**
   * Returns the id of the service account a fake request minted by this registry is bound to, or
   * `undefined` for any other request, including released ones and ones whose `authorization`
   * header no longer carries the token this registry issued for them.
   */
  getServiceAccountId(request: KibanaRequest): string | undefined {
    const entry = this.registry.get(request);
    if (!entry) {
      return undefined;
    }

    // The headers are mutable in place, so a swapped credential would otherwise still be vouched
    // for as the service account while Elasticsearch authenticates someone else.
    if (request.headers.authorization !== `Bearer ${entry.token}`) {
      this.logger.error(
        `Authorization header on a fake request bound to service account [${entry.serviceAccountId}] ` +
          `was replaced; refusing to identify the request as that service account.`
      );
      return undefined;
    }

    return entry.serviceAccountId;
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

    if (entry.nonRetryableError) {
      throw entry.nonRetryableError;
    }

    this.ensureWithinLifetime(entry);

    if (entry.inflight) {
      return await entry.inflight;
    }

    const now = Date.now();
    if (entry.retryAt !== undefined && now < entry.retryAt) {
      throw new Error(
        'A recent attempt to mint a service account token failed; refusing to retry yet.'
      );
    }

    if (now - entry.mintedAt < maxAgeMs) {
      return entry.token;
    }

    // Remembers the exchange's own failure, if any, so the interceptor's failures can be told
    // apart from it below: the two are retried under different rules.
    let exchangeFailure: { error: unknown } | undefined;

    entry.inflight = this.mintWithInterceptor(entry.serviceAccountId, entry.mintInterceptor, {
      onExchangeFailure: (error) => {
        exchangeFailure = { error };
      },
    })
      .then((token) => {
        this.ensureStillRegistered(request, entry);
        this.ensureWithinLifetime(entry);

        // Registry-owned fake requests share mutable raw headers, so subsequent scoped clients
        // observe this replacement despite KibanaRequest exposing the headers as readonly.
        (request.headers as Record<string, string>).authorization = `Bearer ${token}`;
        entry.token = token;
        entry.mintedAt = Date.now();
        entry.retryAt = undefined;
        this.logger.debug(
          `Replaced the token of a fake request bound to service account ${entry.serviceAccountId}`
        );
        return token;
      })
      .catch((err) => {
        // A released entry can never refresh again, so recording a backoff or a terminal error
        // on it would only describe a request nothing will ask about.
        if (this.registry.get(request) !== entry) {
          throw err;
        }

        const raisedByInterceptor =
          entry.mintInterceptor !== undefined &&
          !(exchangeFailure !== undefined && err === exchangeFailure.error);

        if (isTerminalMintFailure(err, { raisedByInterceptor })) {
          entry.nonRetryableError =
            err instanceof Error
              ? err
              : new Error('Service account token exchange failed.', { cause: err });
        } else {
          const retryAfterMs =
            err instanceof ServiceAccountTokenExchangeError ? err.retryAfterMs : 0;
          entry.retryAt =
            Date.now() + Math.max(SERVICE_ACCOUNT_MINT_FAILURE_BACKOFF_MS, retryAfterMs);
        }
        this.logger.warn(
          `Failed to replace the token of a fake request bound to service account ${
            entry.serviceAccountId
          } (${entry.nonRetryableError ? 'terminal' : 'retryable'} failure)`
        );
        throw err;
      })
      .finally(() => {
        entry.inflight = undefined;
      });

    return await entry.inflight;
  }

  /**
   * Drops the request from the registry and strips its credential.
   * Idempotent; returns whether the request was registered.
   */
  release(request: KibanaRequest): boolean {
    const released = this.registry.delete(request);
    if (released) {
      // Same shared raw headers as the refresh path writes to, so every scoped client derived from
      // this request loses the credential at once.
      delete (request.headers as Record<string, string>).authorization;
      this.logger.debug('Released a service account bound fake request');
    }
    return released;
  }

  private mintWithInterceptor(
    serviceAccountId: string,
    mintInterceptor?: ServiceAccountMintInterceptor,
    { onExchangeFailure }: { onExchangeFailure?: (error: unknown) => void } = {}
  ): Promise<string> {
    const mint = () =>
      this.mintToken(serviceAccountId).catch((error) => {
        onExchangeFailure?.(error);
        throw error;
      });
    return mintInterceptor ? mintInterceptor(mint) : mint();
  }

  private ensureStillRegistered(
    request: KibanaRequest,
    entry: ServiceAccountFakeRequestEntry
  ): void {
    if (this.registry.get(request) !== entry) {
      throw new Error(
        'The request bound to this service account was released while its credential was being replaced.'
      );
    }
  }

  private ensureWithinLifetime(entry: ServiceAccountFakeRequestEntry): void {
    // Expiry stops replacement; an already-issued token retains its upstream expiration.
    const ageMs = Date.now() - entry.createdAt;
    if (ageMs >= entry.maxLifetimeMs) {
      // The age is what makes an anomaly visible: a request refreshed long after its lifetime
      // points at a caller holding on to one it should have let go of.
      this.logger.debug(
        `Refresh lifetime expired for a fake request bound to service account ${entry.serviceAccountId}: the request is ${ageMs}ms old, the lifetime is ${entry.maxLifetimeMs}ms`
      );
      entry.nonRetryableError = new Error(
        'The lease on this service account bound request has expired; refusing to mint a replacement credential.'
      );
      throw entry.nonRetryableError;
    }
  }
}
