/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/logging';

import {
  SERVICE_ACCOUNT_MINT_FAILURE_BACKOFF_MS,
  SERVICE_ACCOUNT_REQUEST_MAX_LIFETIME_MS,
  ServiceAccountFakeRequests,
} from './fake_requests';

// Arbitrary freshness window for exercising `ensureFreshToken`; the production value is the
// 401-retry reuse window, but the method is policy-agnostic and takes it as a parameter.
const MAX_AGE_MS = 30_000;

describe('ServiceAccountFakeRequests', () => {
  let logger: Logger;
  let mintToken: jest.Mock<Promise<string>, [string]>;
  let fakeRequests: ServiceAccountFakeRequests;

  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(new Date('2026-08-20T12:00:00.000Z'));

    logger = loggingSystemMock.create().get('service-accounts');
    let counter = 0;
    mintToken = jest.fn().mockImplementation(async () => `essu_token_${++counter}`);
    fakeRequests = new ServiceAccountFakeRequests(logger, mintToken);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('#create', () => {
    it('mints a token and binds it to a fake request with a lowercase `authorization` header', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });

      expect(mintToken).toHaveBeenCalledTimes(1);
      expect(mintToken).toHaveBeenCalledWith('sa-id');
      expect(request.isFakeRequest).toBe(true);
      // The exact lowercase key is load-bearing for the ES client's fake-request header filtering.
      expect(Object.keys(request.headers)).toEqual(['authorization']);
      expect(request.headers.authorization).toBe('Bearer essu_token_1');
      expect(fakeRequests.isServiceAccountRequest(request)).toBe(true);
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
      expect(mintToken).toHaveBeenCalledWith('sa-id');
      expect(request.headers.authorization).toBe('Bearer essu_token_2');
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
      mintToken.mockRejectedValueOnce(new Error('exchange failed'));

      jest.advanceTimersByTime(MAX_AGE_MS);
      await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).rejects.toThrowError(
        'exchange failed'
      );

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
      // The stale token is left in place; a later refresh (post-backoff) replaces it.
      expect(request.headers.authorization).toBe('Bearer essu_token_1');
    });

    it('fails closed without minting once the default lease has expired', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockClear();

      jest.advanceTimersByTime(SERVICE_ACCOUNT_REQUEST_MAX_LIFETIME_MS + 1);

      await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).rejects.toThrowError(
        'The lease on this service account bound request has expired; refusing to mint a replacement credential.'
      );
      expect(mintToken).not.toHaveBeenCalled();
      // The request rides out its current (long-dead) token; nothing is replaced.
      expect(request.headers.authorization).toBe('Bearer essu_token_1');
    });

    it('honors a custom `maxLifetimeMs` lease', async () => {
      const request = await fakeRequests.create({
        serviceAccountId: 'sa-id',
        maxLifetimeMs: 1_000,
      });
      mintToken.mockClear();

      jest.advanceTimersByTime(1_001);

      await expect(fakeRequests.ensureFreshToken(request, 0)).rejects.toThrowError(
        'The lease on this service account bound request has expired; refusing to mint a replacement credential.'
      );
      expect(mintToken).not.toHaveBeenCalled();
    });

    it('still refreshes right up to the lease boundary', async () => {
      const request = await fakeRequests.create({
        serviceAccountId: 'sa-id',
        maxLifetimeMs: MAX_AGE_MS * 2,
      });
      mintToken.mockClear();

      jest.advanceTimersByTime(MAX_AGE_MS * 2);

      await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).resolves.toBe(
        'essu_token_2'
      );
      expect(mintToken).toHaveBeenCalledTimes(1);
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

    it('wraps every refresh mint; interceptor refusals are backed off like mint failures', async () => {
      let refuse = false;
      const mintInterceptor = jest.fn(async (mint: () => Promise<string>) => {
        if (refuse) {
          throw new Error('binding no longer exists');
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

      // Within the backoff window the interceptor is not even consulted again.
      await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).rejects.toThrowError(
        'A recent attempt to mint a service account token failed; refusing to retry yet.'
      );
      expect(mintInterceptor).toHaveBeenCalledTimes(2);

      // Once the backoff elapses and the interceptor permits again, minting resumes.
      refuse = false;
      jest.advanceTimersByTime(SERVICE_ACCOUNT_MINT_FAILURE_BACKOFF_MS);
      await expect(fakeRequests.ensureFreshToken(request, MAX_AGE_MS)).resolves.toBe(
        'essu_token_2'
      );
      expect(request.headers.authorization).toBe('Bearer essu_token_2');
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

  describe('#release', () => {
    it('reports whether the request was registered and is idempotent', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });

      expect(fakeRequests.release(request)).toBe(true);
      expect(fakeRequests.release(request)).toBe(false);
      expect(fakeRequests.release(httpServerMock.createFakeKibanaRequest({}))).toBe(false);
    });

    it('permanently disables credential replacement', async () => {
      const request = await fakeRequests.create({ serviceAccountId: 'sa-id' });
      mintToken.mockClear();

      fakeRequests.release(request);

      expect(fakeRequests.isServiceAccountRequest(request)).toBe(false);
      await expect(fakeRequests.ensureFreshToken(request, 0)).rejects.toThrowError(
        'The provided request is not bound to a service account.'
      );
      expect(mintToken).not.toHaveBeenCalled();
      // The request rides out its current token; nothing is replaced.
      expect(request.headers.authorization).toBe('Bearer essu_token_1');
    });

    it('a release during an in-flight mint leaves the request header untouched', async () => {
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

      // The caller that was already awaiting the mint still receives its token, but the
      // released request's credential is never extended.
      await expect(inflight).resolves.toBe('essu_token_late');
      expect(request.headers.authorization).toBe('Bearer essu_token_1');
    });
  });
});
