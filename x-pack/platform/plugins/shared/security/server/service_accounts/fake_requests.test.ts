/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/logging';

import { ServiceAccountCredentialRefusedError } from './credential_refused_error';
import type { ServiceAccountMintOptions } from './fake_requests';
import {
  isTerminalMintFailure,
  SERVICE_ACCOUNT_MINT_FAILURE_BACKOFF_MS,
  SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS,
  ServiceAccountFakeRequests,
} from './fake_requests';
import { ServiceAccountTokenExchangeError } from './token_exchange_error';

// Arbitrary freshness window for exercising `ensureFreshToken`; the production value is the
// 401-retry reuse window, but the method is policy-agnostic and takes it as a parameter.
const MAX_AGE_MS = 30_000;
const REQUEST_LIFETIME_MS = 10 * 60 * 1000;

describe('ServiceAccountFakeRequests', () => {
  let logger: Logger;
  let mintToken: jest.Mock<Promise<string>, [string, ServiceAccountMintOptions]>;
  // What the backend reports as the lifetime of every token `mintToken` returns.
  let tokenExpiresInMs: number | undefined;
  let fakeRequests: ServiceAccountFakeRequests;

  const createRegistry = (requestLifetimeMs: number) =>
    new ServiceAccountFakeRequests(
      logger,
      async (serviceAccountId, options) => ({
        token: await mintToken(serviceAccountId, options),
        expiresInMs: tokenExpiresInMs,
      }),
      requestLifetimeMs
    );

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(new Date('2026-08-20T12:00:00.000Z'));

    logger = loggingSystemMock.create().get('service-accounts');
    let counter = 0;
    mintToken = jest.fn().mockImplementation(async () => `essu_token_${++counter}`);
    tokenExpiresInMs = undefined;
    fakeRequests = createRegistry(REQUEST_LIFETIME_MS);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('#create', () => {
    it('mints a token and binds it to a fake request with a lowercase `authorization` header', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });

      expect(mintToken).toHaveBeenCalledTimes(1);
      expect(mintToken).toHaveBeenCalledWith('sa-id', { boundAt: undefined });
      expect(request.isFakeRequest).toBe(true);
      // The exact lowercase key is load-bearing for the ES client's fake-request header filtering.
      expect(Object.keys(request.headers)).toEqual(['authorization']);
      expect(request.headers.authorization).toBe('Bearer essu_token_1');
      expect(fakeRequests.isServiceAccountRequest(request)).toBe(true);
    });

    it.each([0, -1, Number.NaN])(
      'rejects a lifetime of %p without minting',
      async (maxLifetimeMs) => {
        await expect(
          fakeRequests.create({ serviceAccountId: 'sa-id', maxLifetimeMs })
        ).rejects.toThrowError('must be a positive number of milliseconds');
        expect(mintToken).not.toHaveBeenCalled();
      }
    );

    it('rejects an unbounded lifetime that no mint interceptor stands behind', async () => {
      await expect(
        fakeRequests.create({ serviceAccountId: 'sa-id', maxLifetimeMs: Number.POSITIVE_INFINITY })
      ).rejects.toThrowError('must have a mint interceptor');
      expect(mintToken).not.toHaveBeenCalled();
    });

    it('accepts an unbounded lifetime gated by a mint interceptor', async () => {
      const request = await fakeRequests.create({
        serviceAccountId: 'sa-id',
        maxLifetimeMs: Number.POSITIVE_INFINITY,
        mintInterceptor: async (mint) => await mint(),
      });

      jest.advanceTimersByTime(REQUEST_LIFETIME_MS * 10);
      await expect(fakeRequests.ensureFreshToken(request, 0)).resolves.toBe('essu_token_2');
    });

    it('marks the request as authenticated so capabilities are not force-disabled', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      expect(request.auth.isAuthenticated).toBe(true);
    });

    it('scopes the request to the provided space, defaulting to the default space', async () => {
      const scoped = await fakeRequests.create({ serviceAccountId: 'sa-id', spaceId: 'marketing' });
      expect(scoped.spaceId).toBe('marketing');

      const unscoped = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      expect(unscoped.spaceId).toBe('default');
    });

    it('propagates mint failures', async () => {
      mintToken.mockRejectedValueOnce(new Error('exchange failed'));
      await expect(fakeRequests.create({ serviceAccountId: 'sa-id' })).rejects.toThrowError(
        'exchange failed'
      );
    });
  });

  describe('#isServiceAccountRequest', () => {
    it('returns false for requests it did not mint', () => {
      expect(fakeRequests.isServiceAccountRequest(httpServerMock.createKibanaRequest())).toBe(
        false
      );
      expect(fakeRequests.isServiceAccountRequest(httpServerMock.createFakeKibanaRequest({}))).toBe(
        false
      );
    });
  });

  describe('#getServiceAccountId', () => {
    it('returns the id the request was minted for', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      expect(fakeRequests.getServiceAccountId(request)).toBe('sa-id');
    });

    it('returns undefined for requests it did not mint', () => {
      expect(
        fakeRequests.getServiceAccountId(httpServerMock.createKibanaRequest())
      ).toBeUndefined();
      expect(
        fakeRequests.getServiceAccountId(httpServerMock.createFakeKibanaRequest({}))
      ).toBeUndefined();
    });

    it('returns undefined once the request has been released', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      fakeRequests.release(request);
      expect(fakeRequests.getServiceAccountId(request)).toBeUndefined();
    });

    it('keeps identifying the request after its token has been replaced', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      await fakeRequests.ensureFreshToken(request, 0);

      expect(request.headers.authorization).toBe('Bearer essu_token_2');
      expect(fakeRequests.getServiceAccountId(request)).toBe('sa-id');
    });

    it('returns undefined when the authorization header has been swapped for another credential', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      (request.headers as Record<string, string>).authorization = 'ApiKey someone-else';

      expect(fakeRequests.getServiceAccountId(request)).toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('was replaced'));
    });

    it('returns undefined when the authorization header has been removed', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      delete (request.headers as Record<string, string>).authorization;

      expect(fakeRequests.getServiceAccountId(request)).toBeUndefined();
    });
  });

  describe('#ensureFreshToken', () => {
    it('throws for requests it did not mint', async () => {
      await expect(
        fakeRequests.ensureFreshToken(httpServerMock.createFakeKibanaRequest({}), 0)
      ).rejects.toThrowError('The provided request is not bound to a service account.');
      expect(mintToken).not.toHaveBeenCalled();
    });

    it('returns the current token without minting while it is fresh', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockClear();

      jest.advanceTimersByTime(MAX_AGE_MS - 1);
      await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).resolves.toBe(
        'essu_token_1'
      );
      expect(mintToken).not.toHaveBeenCalled();
      expect(request.headers.authorization).toBe('Bearer essu_token_1');
    });

    it('mints a replacement and updates the request header in place once stale', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockClear();

      jest.advanceTimersByTime(MAX_AGE_MS);
      await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).resolves.toBe(
        'essu_token_2'
      );

      expect(mintToken).toHaveBeenCalledTimes(1);
      expect(mintToken).toHaveBeenCalledWith('sa-id', { boundAt: undefined });
      expect(request.headers.authorization).toBe('Bearer essu_token_2');
    });

    it('tells every mint when the workload was bound', async () => {
      const boundAt = '2026-10-01T00:00:00.000Z';
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id', boundAt });
      expect(mintToken).toHaveBeenLastCalledWith('sa-id', { boundAt });

      jest.advanceTimersByTime(MAX_AGE_MS);
      await fakeRequests.ensureFreshToken(request, MAX_AGE_MS);

      expect(mintToken).toHaveBeenCalledTimes(2);
      expect(mintToken).toHaveBeenLastCalledWith('sa-id', { boundAt });
    });

    it('deduplicates concurrent refreshes into a single mint', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockClear();

      let resolveMint!: (token: string) => void;
      mintToken.mockImplementationOnce(
        () => new Promise<string>((resolve) => (resolveMint = resolve))
      );

      jest.advanceTimersByTime(MAX_AGE_MS);
      const first = fakeRequests.ensureFreshToken(request, MAX_AGE_MS);
      const second = fakeRequests.ensureFreshToken(request, MAX_AGE_MS);

      resolveMint('essu_token_shared');

      await expect(first).resolves.toBe('essu_token_shared');
      await expect(second).resolves.toBe('essu_token_shared');
      expect(mintToken).toHaveBeenCalledTimes(1);
      expect(request.headers.authorization).toBe('Bearer essu_token_shared');
    });

    it('backs off after a failed mint, then allows a new attempt', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockClear();
      const error = new ServiceAccountTokenExchangeError(new Error('exchange failed'), {
        retryable: true,
      });
      mintToken.mockRejectedValueOnce(error);

      jest.advanceTimersByTime(MAX_AGE_MS);
      await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).rejects.toBe(error);

      // Within the backoff window, no mint attempt is made.
      await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).rejects.toThrowError(
        'A recent attempt to mint a service account token failed; refusing to retry yet.'
      );
      expect(mintToken).toHaveBeenCalledTimes(1);

      // Once the backoff elapses, minting resumes.
      jest.advanceTimersByTime(SERVICE_ACCOUNT_MINT_FAILURE_BACKOFF_MS);
      await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).resolves.toBe(
        'essu_token_2'
      );
      expect(request.headers.authorization).toBe('Bearer essu_token_2');
    });

    it('the failed mint stays failed for callers awaiting the same in-flight mint', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockClear();

      let rejectMint!: (err: Error) => void;
      mintToken.mockImplementationOnce(
        () => new Promise<string>((resolve, reject) => (rejectMint = reject))
      );

      jest.advanceTimersByTime(MAX_AGE_MS);
      const first = fakeRequests.ensureFreshToken(request, MAX_AGE_MS);
      const second = fakeRequests.ensureFreshToken(request, MAX_AGE_MS);

      rejectMint(new Error('exchange failed'));

      await expect(first).rejects.toThrowError('exchange failed');
      await expect(second).rejects.toThrowError('exchange failed');
      expect(mintToken).toHaveBeenCalledTimes(1);
      // The stale token is left in place, but this request can no longer refresh.
      expect(request.headers.authorization).toBe('Bearer essu_token_1');
    });

    it('fails closed without minting once the default lease has expired', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockClear();

      jest.advanceTimersByTime(REQUEST_LIFETIME_MS + 1);

      await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).rejects.toThrowError(
        'The lease on this service account bound request has expired; refusing to mint a replacement credential.'
      );
      expect(mintToken).not.toHaveBeenCalled();
      // The request rides out its current (long-dead) token; nothing is replaced.
      expect(request.headers.authorization).toBe('Bearer essu_token_1');
      // The age is logged so a request refreshed long past its lifetime stands out.
      expect(logger.debug).toHaveBeenCalledWith(
        `Refresh lifetime expired for a fake request bound to service account sa-id: the request is ${
          REQUEST_LIFETIME_MS + 1
        }ms old, the lifetime is ${REQUEST_LIFETIME_MS}ms`
      );
    });

    it('honors a configured registry lifetime', async () => {
      fakeRequests = createRegistry(1_000);
      const request = await fakeRequests.create({
        serviceAccountId: 'sa-id',
      });
      mintToken.mockClear();

      jest.advanceTimersByTime(1_001);

      await expect(fakeRequests.ensureFreshToken(request, 0)).rejects.toThrowError(
        'The lease on this service account bound request has expired; refusing to mint a replacement credential.'
      );
      expect(mintToken).not.toHaveBeenCalled();
    });

    it('still refreshes just before the lease boundary', async () => {
      const request = await fakeRequests.create({
        serviceAccountId: 'sa-id',
      });
      mintToken.mockClear();

      jest.advanceTimersByTime(REQUEST_LIFETIME_MS - 1);

      await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).resolves.toBe(
        'essu_token_2'
      );
      expect(mintToken).toHaveBeenCalledTimes(1);
    });
    it('rejects at the exact lifetime boundary even when the token is fresh', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      jest.advanceTimersByTime(REQUEST_LIFETIME_MS);
      await expect(fakeRequests.ensureFreshToken(request, Infinity)).rejects.toThrow('lease');
      expect(mintToken).toHaveBeenCalledTimes(1);
    });

    it('does not install a token when the lifetime expires during the exchange', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      let resolveMint: (token: string) => void = jest.fn();
      mintToken.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveMint = resolve;
          })
      );
      jest.advanceTimersByTime(REQUEST_LIFETIME_MS - 1);
      const first = fakeRequests.ensureFreshToken(request, 0);
      const second = fakeRequests.ensureFreshToken(request, 0);
      jest.advanceTimersByTime(1);
      resolveMint('late-token');
      await expect(first).rejects.toThrow('lease');
      await expect(second).rejects.toThrow('lease');
      expect(request.headers.authorization).toBe('Bearer essu_token_1');
      await expect(fakeRequests.ensureFreshToken(request, 0)).rejects.toThrow('lease');
      expect(mintToken).toHaveBeenCalledTimes(2);
    });

    it.each([
      new ServiceAccountTokenExchangeError(new Error('revoked'), { retryable: false }),
      new Error('unclassified failure'),
    ])('retains terminal failure and never returns a cached token: %s', async (error) => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockRejectedValueOnce(error);
      await expect(fakeRequests.ensureFreshToken(request, 0)).rejects.toBe(error);
      await expect(fakeRequests.ensureFreshToken(request, Infinity)).rejects.toBe(error);
      jest.advanceTimersByTime(SERVICE_ACCOUNT_MINT_FAILURE_BACKOFF_MS);
      await expect(fakeRequests.ensureFreshToken(request, 0)).rejects.toBe(error);
      expect(mintToken).toHaveBeenCalledTimes(2);
      const otherRequest = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      await expect(fakeRequests.ensureFreshToken(otherRequest, MAX_AGE_MS)).resolves.toBe(
        'essu_token_2'
      );
    });

    it('honors a longer retry delay without returning the cached token during backoff', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      const error = new ServiceAccountTokenExchangeError(new Error('throttled'), {
        retryable: true,
        retryAfterMs: 20_000,
      });
      mintToken.mockRejectedValueOnce(error);
      await expect(fakeRequests.ensureFreshToken(request, 0)).rejects.toBe(error);
      jest.advanceTimersByTime(19_999);
      await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).rejects.toThrow(
        'refusing to retry yet'
      );
      expect(mintToken).toHaveBeenCalledTimes(2);
      jest.advanceTimersByTime(1);
      await expect(fakeRequests.ensureFreshToken(request, 0)).resolves.toBe('essu_token_2');
    });

    it('logs the account ID without logging tokens or upstream error contents', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      await fakeRequests.ensureFreshToken(request, 0);
      mintToken.mockRejectedValueOnce(new Error('secret-token'));
      await expect(fakeRequests.ensureFreshToken(request, 0)).rejects.toThrow('secret-token');
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('sa-id'));
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('sa-id'));
      for (const call of [
        ...jest.mocked(logger.debug).mock.calls,
        ...jest.mocked(logger.warn).mock.calls,
      ]) {
        expect(String(call[0])).not.toMatch(/essu_token|secret-token/);
      }
    });
  });

  describe('mint interceptor', () => {
    it('wraps the initial mint, receiving the mint function and returning its result', async () => {
      const order: string[] = [];
      const mintInterceptor = jest.fn(async (mint: () => Promise<string>) => {
        order.push('verify');
        const token = await mint();
        order.push('minted');
        return token;
      });

      const request = await fakeRequests.create({ serviceAccountId: 'sa-id', mintInterceptor });

      expect(mintInterceptor).toHaveBeenCalledTimes(1);
      expect(order).toEqual(['verify', 'minted']);
      expect(request.headers.authorization).toBe('Bearer essu_token_1');
    });

    it('propagates an interceptor refusal from create without minting', async () => {
      const mintInterceptor = jest.fn(async () => {
        throw new Error('binding no longer exists');
      });

      await expect(
        fakeRequests.create({ serviceAccountId: 'sa-id', mintInterceptor })
      ).rejects.toThrowError('binding no longer exists');
      expect(mintToken).not.toHaveBeenCalled();
    });

    it('wraps every refresh mint; an interceptor refusal is terminal', async () => {
      let refuse = false;
      const mintInterceptor = jest.fn(async (mint: () => Promise<string>) => {
        if (refuse) {
          throw Boom.notFound('binding no longer exists');
        }
        return await mint();
      });

      const request = await fakeRequests.create({ serviceAccountId: 'sa-id', mintInterceptor });
      mintToken.mockClear();
      refuse = true;

      jest.advanceTimersByTime(MAX_AGE_MS);
      await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).rejects.toThrowError(
        'binding no longer exists'
      );
      expect(mintToken).not.toHaveBeenCalled();

      // A refusal is not a transient failure, so it is never backed off and retried: the
      // interceptor is not consulted again even once the workload would permit minting anew.
      refuse = false;
      jest.advanceTimersByTime(SERVICE_ACCOUNT_MINT_FAILURE_BACKOFF_MS);
      await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).rejects.toThrowError(
        'binding no longer exists'
      );
      expect(mintInterceptor).toHaveBeenCalledTimes(2);
      expect(mintToken).not.toHaveBeenCalled();
    });

    it.each([
      ['a plain error', () => new Error('cluster unavailable')],
      ['a server error', () => Boom.serverUnavailable('cluster unavailable')],
      ['a too-many-requests error', () => Boom.tooManyRequests('cluster unavailable')],
    ])(
      'backs off and retries when the interceptor fails with %s, keeping the current token',
      async (_name, createError) => {
        let fail = false;
        const mintInterceptor = jest.fn(async (mint: () => Promise<string>) => {
          if (fail) {
            throw createError();
          }
          return await mint();
        });

        const request = await fakeRequests.create({ serviceAccountId: 'sa-id', mintInterceptor });
        mintToken.mockClear();
        fail = true;

        jest.advanceTimersByTime(MAX_AGE_MS);
        await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).rejects.toThrowError(
          'cluster unavailable'
        );
        expect(mintToken).not.toHaveBeenCalled();
        // The failure was in the check, not a refusal: the request keeps its current token.
        expect(request.headers.authorization).toBe('Bearer essu_token_1');

        // Within the backoff window the interceptor is not consulted again.
        await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).rejects.toThrowError(
          'refusing to retry yet'
        );
        expect(mintInterceptor).toHaveBeenCalledTimes(2);

        // Once the backoff lapses and the check succeeds, minting resumes.
        fail = false;
        jest.advanceTimersByTime(SERVICE_ACCOUNT_MINT_FAILURE_BACKOFF_MS);
        await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).resolves.toBe(
          'essu_token_2'
        );
        expect(mintInterceptor).toHaveBeenCalledTimes(3);
        expect(request.headers.authorization).toBe('Bearer essu_token_2');
      }
    );

    it('leaves a failure of the exchange itself classified by the exchange, even through an interceptor', async () => {
      const mintInterceptor = jest.fn(async (mint: () => Promise<string>) => await mint());
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id', mintInterceptor });
      const error = new Error('unclassified failure');
      mintToken.mockRejectedValueOnce(error);

      jest.advanceTimersByTime(MAX_AGE_MS);
      await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).rejects.toBe(error);

      // An unexpected exchange failure fails closed, exactly as it does without an interceptor.
      jest.advanceTimersByTime(SERVICE_ACCOUNT_MINT_FAILURE_BACKOFF_MS);
      await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).rejects.toBe(error);
      expect(mintToken).toHaveBeenCalledTimes(2);
    });

    it('deduplicates concurrent refreshes into a single interceptor invocation', async () => {
      const mintInterceptor = jest.fn(async (mint: () => Promise<string>) => await mint());
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id', mintInterceptor });
      mintToken.mockClear();
      mintInterceptor.mockClear();

      let resolveMint!: (token: string) => void;
      mintToken.mockImplementationOnce(
        () => new Promise<string>((resolve) => (resolveMint = resolve))
      );

      jest.advanceTimersByTime(MAX_AGE_MS);
      const first = fakeRequests.ensureFreshToken(request, MAX_AGE_MS);
      const second = fakeRequests.ensureFreshToken(request, MAX_AGE_MS);

      resolveMint('essu_token_shared');

      await expect(first).resolves.toBe('essu_token_shared');
      await expect(second).resolves.toBe('essu_token_shared');
      expect(mintInterceptor).toHaveBeenCalledTimes(1);
    });
  });

  describe('#carriesIssuedToken', () => {
    it('is true while the request carries the token issued for it', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });

      expect(fakeRequests.carriesIssuedToken(request)).toBe(true);
    });

    it('is false once the authorization header was swapped', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      (request.headers as Record<string, string>).authorization = 'Bearer someone_else';

      expect(fakeRequests.carriesIssuedToken(request)).toBe(false);
      // Unlike `getServiceAccountId`, this is a plain check and logs nothing.
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('is false for released and unrelated requests', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      fakeRequests.release(request);

      expect(fakeRequests.carriesIssuedToken(request)).toBe(false);
      expect(
        fakeRequests.carriesIssuedToken(
          httpServerMock.createFakeKibanaRequest({
            headers: { authorization: 'Bearer essu_token_1' },
          })
        )
      ).toBe(false);
    });
  });

  describe('#ensureTokenValidFor', () => {
    const TOKEN_LIFETIME_MS = 5 * 60 * 1000;

    /** Makes the next mint answer only after `delayMs`. */
    const delayNextMint = (token: string, delayMs: number) =>
      mintToken.mockImplementationOnce(
        () => new Promise<string>((resolve) => setTimeout(() => resolve(token), delayMs))
      );

    const refusingInterceptor = () => {
      const state = { refuse: false };
      const mintInterceptor = async (mint: () => Promise<string>) => {
        if (state.refuse) {
          throw Boom.forbidden('binding [secret-binding-detail] no longer exists');
        }
        return await mint();
      };
      return { state, mintInterceptor };
    };

    beforeEach(() => {
      tokenExpiresInMs = TOKEN_LIFETIME_MS;
    });

    it('throws for a request that is not bound to a service account', async () => {
      await expect(
        fakeRequests.ensureTokenValidFor(httpServerMock.createFakeKibanaRequest({}), 60_000)
      ).rejects.toThrowError('The provided request is not bound to a service account.');
    });

    it('keeps a token that covers the call', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockClear();

      jest.advanceTimersByTime(TOKEN_LIFETIME_MS - 60_000);

      await expect(fakeRequests.ensureTokenValidFor(request, 60_000)).resolves.toBe('essu_token_1');
      expect(mintToken).not.toHaveBeenCalled();
    });

    it('replaces a token that would expire within the call', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockClear();

      jest.advanceTimersByTime(TOKEN_LIFETIME_MS - 59_999);

      await expect(fakeRequests.ensureTokenValidFor(request, 60_000)).resolves.toBe('essu_token_2');
      expect(mintToken).toHaveBeenCalledTimes(1);
      expect(request.headers.authorization).toBe('Bearer essu_token_2');
    });

    it('replaces a token whenever a fresh one would cover more of the call', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockClear();

      // Three minutes left cannot cover a four minute call, but a new five minute token can.
      jest.advanceTimersByTime(2 * 60_000);

      await expect(fakeRequests.ensureTokenValidFor(request, 4 * 60_000)).resolves.toBe(
        'essu_token_2'
      );
      expect(mintToken).toHaveBeenCalledTimes(1);
    });

    it('answers a call longer than any token with one minted within the reuse window', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockClear();

      jest.advanceTimersByTime(SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS);
      await expect(fakeRequests.ensureTokenValidFor(request, 2 * TOKEN_LIFETIME_MS)).resolves.toBe(
        'essu_token_1'
      );
      expect(mintToken).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      await expect(fakeRequests.ensureTokenValidFor(request, 2 * TOKEN_LIFETIME_MS)).resolves.toBe(
        'essu_token_2'
      );
      expect(mintToken).toHaveBeenCalledTimes(1);
    });

    it('never replaces a token whose lifetime is within the reuse window', async () => {
      tokenExpiresInMs = 500;
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockClear();

      jest.advanceTimersByTime(400);

      await expect(fakeRequests.ensureTokenValidFor(request, 60_000)).resolves.toBe('essu_token_1');
      expect(mintToken).not.toHaveBeenCalled();
    });

    it('counts the lifetime of the first token from before its exchange', async () => {
      delayNextMint('essu_slow', 30_000);
      const pending = fakeRequests.create({ serviceAccountId: 'sa-id' });
      await jest.advanceTimersByTimeAsync(30_000);
      const request = await pending;
      mintToken.mockClear();

      // 230s are really left, though 260s would be if the lifetime ran from when the mint answered.
      jest.advanceTimersByTime(40_000);

      await expect(fakeRequests.ensureTokenValidFor(request, 240_000)).resolves.toBe(
        'essu_token_1'
      );
      expect(mintToken).toHaveBeenCalledTimes(1);
    });

    it('counts the lifetime of a replacement from before its exchange', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      jest.advanceTimersByTime(TOKEN_LIFETIME_MS - 10_000);
      delayNextMint('essu_slow', 30_000);
      const pending = fakeRequests.ensureTokenValidFor(request, 60_000);
      await jest.advanceTimersByTimeAsync(30_000);
      await expect(pending).resolves.toBe('essu_slow');
      mintToken.mockClear();

      // 60s are really left, though 90s would be if the lifetime ran from when the mint answered.
      jest.advanceTimersByTime(TOKEN_LIFETIME_MS - 30_000 - 60_000);

      await expect(fakeRequests.ensureTokenValidFor(request, 61_000)).resolves.toBe('essu_token_2');
      expect(mintToken).toHaveBeenCalledTimes(1);
    });

    it('returns a token of unknown lifetime as it is, and never refuses it', async () => {
      tokenExpiresInMs = undefined;
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockClear();

      jest.advanceTimersByTime(REQUEST_LIFETIME_MS + 1);

      await expect(fakeRequests.ensureTokenValidFor(request, 60_000)).resolves.toBe('essu_token_1');
      expect(mintToken).not.toHaveBeenCalled();
    });

    it.each([0, -1, Number.NaN])(
      'treats a reported lifetime of %p as unknown',
      async (expiresInMs) => {
        tokenExpiresInMs = expiresInMs;
        const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
        mintToken.mockClear();

        await expect(fakeRequests.ensureTokenValidFor(request, 60_000)).resolves.toBe(
          'essu_token_1'
        );
        expect(mintToken).not.toHaveBeenCalled();
      }
    );

    it('keeps the lifetime of a token minted through an interceptor', async () => {
      const request = await fakeRequests.create({
        serviceAccountId: 'sa-id',
        maxLifetimeMs: Number.POSITIVE_INFINITY,
        mintInterceptor: async (mint) => await mint(),
      });
      mintToken.mockClear();

      jest.advanceTimersByTime(TOKEN_LIFETIME_MS - 30_000);

      await expect(fakeRequests.ensureTokenValidFor(request, 60_000)).resolves.toBe('essu_token_2');
      expect(mintToken).toHaveBeenCalledTimes(1);
    });

    it('drops the lifetime of a token an interceptor substituted', async () => {
      const request = await fakeRequests.create({
        serviceAccountId: 'sa-id',
        maxLifetimeMs: Number.POSITIVE_INFINITY,
        mintInterceptor: async (mint) => {
          await mint();
          return 'essu_substituted';
        },
      });
      mintToken.mockClear();

      jest.advanceTimersByTime(TOKEN_LIFETIME_MS - 30_000);

      await expect(fakeRequests.ensureTokenValidFor(request, 60_000)).resolves.toBe(
        'essu_substituted'
      );
      expect(mintToken).not.toHaveBeenCalled();
    });

    describe('refusals', () => {
      it('refuses a call the token cannot cover once a replacement is refused for good', async () => {
        const { state, mintInterceptor } = refusingInterceptor();
        const request = await fakeRequests.create({
          serviceAccountId: 'sa-id',
          maxLifetimeMs: Number.POSITIVE_INFINITY,
          mintInterceptor,
        });
        state.refuse = true;

        jest.advanceTimersByTime(TOKEN_LIFETIME_MS - 30_000);

        const error = await fakeRequests
          .ensureTokenValidFor(request, 60_000)
          .catch((e: Error) => e);
        expect(error).toBeInstanceOf(ServiceAccountCredentialRefusedError);
        expect(error).toMatchObject({ code: 'SERVICE_ACCOUNT_CREDENTIAL_REFUSED' });
      });

      it('carries no upstream detail in the refusal', async () => {
        const { state, mintInterceptor } = refusingInterceptor();
        const request = await fakeRequests.create({
          serviceAccountId: 'sa-id',
          maxLifetimeMs: Number.POSITIVE_INFINITY,
          mintInterceptor,
        });
        state.refuse = true;
        jest.advanceTimersByTime(TOKEN_LIFETIME_MS - 30_000);

        const error = (await fakeRequests
          .ensureTokenValidFor(request, 60_000)
          .catch((e: Error) => e)) as Error;

        expect(error.message).not.toContain('secret-binding-detail');
        expect(error.cause).toBeUndefined();
      });

      it('keeps serving a token that covers the call after a refusal was latched elsewhere', async () => {
        const { state, mintInterceptor } = refusingInterceptor();
        const request = await fakeRequests.create({
          serviceAccountId: 'sa-id',
          maxLifetimeMs: Number.POSITIVE_INFINITY,
          mintInterceptor,
        });
        state.refuse = true;
        jest.advanceTimersByTime(MAX_AGE_MS);
        // The Elasticsearch client's 401 path latches the refusal.
        await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).rejects.toThrow();

        await expect(fakeRequests.ensureTokenValidFor(request, 60_000)).resolves.toBe(
          'essu_token_1'
        );
      });

      it('keeps serving a token that covers the call after the lease expired', async () => {
        fakeRequests = createRegistry(1_000);
        const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
        mintToken.mockClear();

        jest.advanceTimersByTime(2_000);

        await expect(fakeRequests.ensureTokenValidFor(request, 60_000)).resolves.toBe(
          'essu_token_1'
        );
        expect(mintToken).not.toHaveBeenCalled();
      });

      it('refuses a call the token cannot cover after the lease expired', async () => {
        const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
        mintToken.mockClear();

        jest.advanceTimersByTime(REQUEST_LIFETIME_MS + 1);

        await expect(fakeRequests.ensureTokenValidFor(request, 60_000)).rejects.toBeInstanceOf(
          ServiceAccountCredentialRefusedError
        );
        expect(mintToken).not.toHaveBeenCalled();
      });

      it('passes a temporary failure through instead of refusing', async () => {
        const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
        const error = new ServiceAccountTokenExchangeError(new Error('upstream 503'), {
          retryable: true,
          statusCode: 503,
        });
        mintToken.mockRejectedValueOnce(error);
        jest.advanceTimersByTime(TOKEN_LIFETIME_MS - 30_000);

        await expect(fakeRequests.ensureTokenValidFor(request, 60_000)).rejects.toBe(error);
        // Within the backoff, the refusal to retry yet is not a refusal for good either.
        const backoff = await fakeRequests
          .ensureTokenValidFor(request, 60_000)
          .catch((e: Error) => e);
        expect(backoff).not.toBeInstanceOf(ServiceAccountCredentialRefusedError);
        expect(backoff).toMatchObject({
          message:
            'A recent attempt to mint a service account token failed; refusing to retry yet.',
        });
      });

      it('passes a release during the replacement through instead of refusing', async () => {
        const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
        delayNextMint('essu_late', 1_000);
        jest.advanceTimersByTime(TOKEN_LIFETIME_MS - 30_000);

        const pending = fakeRequests.ensureTokenValidFor(request, 60_000).catch((e: Error) => e);
        fakeRequests.release(request);
        await jest.advanceTimersByTimeAsync(1_000);

        const error = await pending;
        expect(error).toBeInstanceOf(Error);
        expect(error).not.toBeInstanceOf(ServiceAccountCredentialRefusedError);
      });
    });
  });

  describe('#release', () => {
    it('reports whether the request was registered and is idempotent', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });

      expect(fakeRequests.release(request)).toBe(true);
      expect(fakeRequests.release(request)).toBe(false);
      expect(fakeRequests.release(httpServerMock.createFakeKibanaRequest({}))).toBe(false);
    });

    it('permanently disables credential replacement and strips the credential', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockClear();

      fakeRequests.release(request);

      expect(fakeRequests.isServiceAccountRequest(request)).toBe(false);
      await expect(fakeRequests.ensureFreshToken(request, 0)).rejects.toThrowError(
        'The provided request is not bound to a service account.'
      );
      expect(mintToken).not.toHaveBeenCalled();
      // A request kept past its release must not keep acting on the credential it was minted with.
      expect(request.headers.authorization).toBeUndefined();
      expect(Object.keys(request.headers)).toEqual([]);
    });

    it('leaves the headers of a request it never minted alone', () => {
      const request = httpServerMock.createFakeKibanaRequest({
        headers: { authorization: 'Bearer someone_elses' },
      });

      expect(fakeRequests.release(request)).toBe(false);
      expect(request.headers.authorization).toBe('Bearer someone_elses');
    });

    it('discards a mint that lands after the release rather than handing back its token', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockClear();

      let resolveMint!: (token: string) => void;
      mintToken.mockImplementationOnce(
        () => new Promise<string>((resolve) => (resolveMint = resolve))
      );

      jest.advanceTimersByTime(MAX_AGE_MS);
      const inflight = fakeRequests.ensureFreshToken(request, MAX_AGE_MS);

      expect(fakeRequests.release(request)).toBe(true);
      resolveMint('essu_token_late');

      // The execution bracket has closed, so the caller that was awaiting this mint is refused
      // rather than allowed to continue on a credential minted after the release.
      await expect(inflight).rejects.toThrowError(
        'The request bound to this service account was released while its credential was being replaced.'
      );
      // The release stripped the credential, and the late mint must not put one back.
      expect(request.headers.authorization).toBeUndefined();
    });

    it('does not record a refresh failure against a request that was already released', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockClear();

      let rejectMint!: (error: Error) => void;
      mintToken.mockImplementationOnce(
        () => new Promise<string>((_resolve, reject) => (rejectMint = reject))
      );

      jest.advanceTimersByTime(MAX_AGE_MS);
      const inflight = fakeRequests.ensureFreshToken(request, MAX_AGE_MS);

      fakeRequests.release(request);
      rejectMint(new Error('exchange failed'));

      await expect(inflight).rejects.toThrowError('exchange failed');
      // Nothing will ever ask this entry to refresh again, so there is no failure to report.
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});

describe('isTerminalMintFailure', () => {
  it.each([
    ['a client error', Boom.forbidden('re-bound'), true],
    ['a missing binding', Boom.notFound('unbound'), true],
    ['a rate limit', Boom.tooManyRequests('slow down'), false],
    ['a server error', Boom.serverUnavailable('store unavailable'), false],
    ['an unexpected exception', new Error('boom'), false],
  ])('treats %s raised by the interceptor as terminal: %s', (_name, error, terminal) => {
    expect(isTerminalMintFailure(error, { raisedByInterceptor: true })).toBe(terminal);
  });

  it('treats any failure not raised by the interceptor as terminal, unless the exchange says otherwise', () => {
    expect(isTerminalMintFailure(new Error('boom'), { raisedByInterceptor: false })).toBe(true);
    expect(
      isTerminalMintFailure(
        new ServiceAccountTokenExchangeError(new Error('503'), { retryable: true }),
        {
          raisedByInterceptor: false,
        }
      )
    ).toBe(false);
    expect(
      isTerminalMintFailure(
        new ServiceAccountTokenExchangeError(new Error('revoked'), { retryable: false }),
        {
          raisedByInterceptor: true,
        }
      )
    ).toBe(true);
  });
});
