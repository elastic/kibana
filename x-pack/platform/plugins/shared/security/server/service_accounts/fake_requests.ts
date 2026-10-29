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

import { ServiceAccountCredentialRefusedError } from './credential_refused_error';
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

/** A credential minted for a service account bound fake request. */
export interface ServiceAccountMintedToken {
  token: string;
  /**
   * How long the token stays valid after it was minted, as reported by the backend that issued it.
   * Omitted when the backend does not say.
   */
  expiresInMs?: number;
}

/** What a backend is told about the request it mints a credential for. */
export interface ServiceAccountMintOptions {
  /** See {@link CreateServiceAccountFakeRequestParams.boundAt}. */
  boundAt?: string;
}

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
  /**
   * When the workload this request runs was bound, as an ISO-8601 timestamp. Every mint is refused
   * for an account created after this: on Elasticsearch, an account deleted and created again
   * under the same name keeps its id, and a binding made before the new account existed was not
   * made for it.
   */
  boundAt?: string;
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
 *
 * Workload executions audit a mint failure exactly when this says it is terminal, so the two
 * rules cannot drift apart: a change here changes which failures reach the audit log.
 */
export const isTerminalMintFailure = (
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
  /** When {@link token} expires upstream, or `undefined` when its backend did not say. */
  expiresAt?: number;
  /** Single-flight mint: concurrent refreshes await the same exchange instead of stampeding UIAM. */
  inflight?: Promise<string>;
  retryAt?: number;
  nonRetryableError?: Error;
  maxLifetimeMs: number;
  mintInterceptor?: ServiceAccountMintInterceptor;
  boundAt?: string;
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
    private readonly mintToken: (
      serviceAccountId: string,
      options: ServiceAccountMintOptions
    ) => Promise<ServiceAccountMintedToken>,
    private readonly requestLifetimeMs: number
  ) {}

  async create({
    serviceAccountId,
    spaceId,
    maxLifetimeMs,
    mintInterceptor,
    boundAt,
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

    const { token, expiresAt } = await this.mintWithInterceptor(
      serviceAccountId,
      { boundAt },
      mintInterceptor
    );

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
      expiresAt,
      maxLifetimeMs: maxLifetimeMs ?? this.requestLifetimeMs,
      mintInterceptor,
      boundAt,
    });

    this.logger.debug(`Created a fake request bound to service account ${serviceAccountId}`);
    return request;
  }

  isServiceAccountRequest(request: KibanaRequest): boolean {
    return this.registry.has(request);
  }

  /**
   * Whether the request is registered and its `authorization` header still carries the token this
   * registry issued for it. Only then may its credential be replaced or vouched for.
   */
  carriesIssuedToken(request: KibanaRequest): boolean {
    const entry = this.registry.get(request);
    return entry !== undefined && hasIssuedToken(request, entry);
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
    if (!hasIssuedToken(request, entry)) {
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

    entry.inflight = this.mintWithInterceptor(
      entry.serviceAccountId,
      { boundAt: entry.boundAt },
      entry.mintInterceptor,
      {
        onExchangeFailure: (error) => {
          exchangeFailure = { error };
        },
      }
    )
      .then(({ token, expiresAt }) => {
        this.ensureStillRegistered(request, entry);
        this.ensureWithinLifetime(entry);

        // Registry-owned fake requests share mutable raw headers, so subsequent scoped clients
        // observe this replacement despite KibanaRequest exposing the headers as readonly.
        (request.headers as Record<string, string>).authorization = `Bearer ${token}`;
        entry.token = token;
        entry.mintedAt = Date.now();
        entry.expiresAt = expiresAt;
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
   * Returns a token that stays valid for at least `validForMs`, minting a replacement (through
   * {@link ensureFreshToken}) when the current one expires sooner. This is the only way to cover a
   * caller that hands the credential to something that cannot refresh it, such as the route
   * handler of a Kibana self HTTP call.
   *
   * No token covers more than its own lifetime, and none is replaced within
   * {@link SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS} of being minted, so `validForMs` is capped at the
   * lifetime minus that window. A caller asking for more than a token can give is answered with a
   * token at most that old.
   *
   * A token that covers the call is returned without any other check, even when the request can no
   * longer mint: an issued token keeps its upstream expiry. So is a token whose backend did not
   * report its lifetime. Otherwise, throws {@link ServiceAccountCredentialRefusedError} when the
   * request will never get a replacement, and whatever {@link ensureFreshToken} throws when a
   * replacement failed for now.
   */
  async ensureTokenValidFor(request: KibanaRequest, validForMs: number): Promise<string> {
    const entry = this.registry.get(request);
    if (!entry) {
      throw new Error('The provided request is not bound to a service account.');
    }

    if (entry.expiresAt === undefined) {
      return entry.token;
    }

    const tokenLifetimeMs = entry.expiresAt - entry.mintedAt;
    const requiredValidityMs = Math.min(
      validForMs,
      tokenLifetimeMs - SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS
    );
    if (entry.expiresAt - Date.now() >= requiredValidityMs) {
      return entry.token;
    }

    try {
      // The current token was just found too short-lived, so any age is too old.
      return await this.ensureFreshToken(request, 0);
    } catch (err) {
      if (this.registry.get(request) === entry && entry.nonRetryableError) {
        throw new ServiceAccountCredentialRefusedError();
      }
      throw err;
    }
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

  private async mintWithInterceptor(
    serviceAccountId: string,
    options: ServiceAccountMintOptions,
    mintInterceptor?: ServiceAccountMintInterceptor,
    { onExchangeFailure }: { onExchangeFailure?: (error: unknown) => void } = {}
  ): Promise<{ token: string; expiresAt?: number }> {
    // The interceptor contract deals in plain tokens, so the expiry of the one it returns is kept
    // aside rather than threaded through it.
    let minted: { token: string; expiresAt?: number } | undefined;
    const mint = async () => {
      // The lifetime is counted from before the exchange was sent, not from when it answered: the
      // token was issued somewhere in between, and erring early never overstates what is left.
      const requestedAt = Date.now();
      try {
        const { token, expiresInMs } = await this.mintToken(serviceAccountId, options);
        minted = { token, expiresAt: toExpiresAt(requestedAt, expiresInMs) };
        return token;
      } catch (error) {
        onExchangeFailure?.(error);
        throw error;
      }
    };

    const token = await (mintInterceptor ? mintInterceptor(mint) : mint());
    return { token, expiresAt: token === minted?.token ? minted.expiresAt : undefined };
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

const toExpiresAt = (requestedAt: number, expiresInMs: number | undefined): number | undefined =>
  expiresInMs !== undefined && expiresInMs > 0 ? requestedAt + expiresInMs : undefined;

const hasIssuedToken = (request: KibanaRequest, entry: ServiceAccountFakeRequestEntry): boolean =>
  request.headers.authorization === `Bearer ${entry.token}`;
