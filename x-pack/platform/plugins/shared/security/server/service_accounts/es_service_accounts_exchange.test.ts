/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import { inspect } from 'node:util';

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

import { ServiceAccountCredentialStore } from './credentials';
import { EsServiceAccounts } from './es_service_accounts';
import { ServiceAccountTokenExchangeError } from './token_exchange_error';
import { licenseMock } from '../../common/licensing/index.mock';
import { getDetailedErrorMessage } from '../errors';
import { securityMock } from '../mocks';

jest.mock('./credentials');

const ACCOUNT_ID = 'kibana/worker';
const credential = {
  serviceAccountId: ACCOUNT_ID,
  namespace: 'kibana',
  name: 'worker',
  tokenName: 'kibana-managed',
  createdAt: '2026-09-23T00:00:00.000Z',
  createdBy: { type: 'user' as const, username: 'creator' },
  token: 'long-lived-secret',
};
const exchangeResponse = {
  access_token: 'short-lived-secret',
  type: 'Bearer',
  expires_in: 1200,
  authentication: { username: ACCOUNT_ID },
};

const setup = ({ canEncrypt = true, requestLifetimeMs = 600_000 } = {}) => {
  const logger = loggingSystemMock.createLogger();
  const license = licenseMock.create();
  license.isEnabled.mockReturnValue(true);
  const clusterClient = elasticsearchServiceMock.createClusterClient();
  const exchange = clusterClient.asInternalUser.security.getToken;
  // @ts-expect-error not full SecurityGetTokenResponse
  exchange.mockResponse(exchangeResponse);
  const credentialStore = jest.mocked(
    new ServiceAccountCredentialStore({
      client: savedObjectsClientMock.create(),
      encryptedClient: encryptedSavedObjectsMock.createClient(),
      isEncryptionError: jest.fn(),
      logger,
    })
  );
  credentialStore.getDecrypted.mockResolvedValue(credential);
  const backend = new EsServiceAccounts({
    logger,
    requestLifetimeMs,
    license,
    clusterClient,
    credentialStore,
    canEncrypt,
    checkPrivilegesWithRequest: jest.fn(),
    getCurrentUser: jest.fn(),
    getCurrentUserProfileId: jest.fn(),
  });
  return { backend, exchange, credentialStore, clusterClient, license, logger };
};

describe('Elasticsearch service account token exchange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
  });
  afterEach(() => jest.useRealTimers());

  it('exchanges as the internal broker and binds only the access token to the requested space', async () => {
    const { backend, credentialStore, clusterClient, exchange } = setup();
    const request = await backend.createFakeRequest({
      serviceAccountId: ACCOUNT_ID,
      spaceId: 'other',
    });
    expect(credentialStore.getDecrypted).toHaveBeenCalledWith(ACCOUNT_ID);
    expect(exchange).toHaveBeenCalledWith({
      grant_type: '_user_managed_service_account',
      service_account_token: credential.token,
    });
    expect(clusterClient.asScoped).not.toHaveBeenCalled();
    expect(request.headers).toEqual({ authorization: 'Bearer short-lived-secret' });
    expect(request.isFakeRequest).toBe(true);
    expect(request.auth.isAuthenticated).toBe(true);
    expect(request.spaceId).toBe('other');
  });

  it.each([
    'elastic/kibana',
    'other/worker',
    'kibana/',
    'kibana/../worker',
    'worker',
    'kibana/a b',
  ])('rejects invalid or unmanaged ID %s before reading credentials', async (serviceAccountId) => {
    const { backend, credentialStore, exchange } = setup();
    await expect(backend.createFakeRequest({ serviceAccountId })).rejects.toMatchObject({
      output: { statusCode: 400 },
    });
    expect(credentialStore.getDecrypted).not.toHaveBeenCalled();
    expect(exchange).not.toHaveBeenCalled();
  });

  it.each(['security', 'encryption'])('refuses exchange without %s', async (gate) => {
    const { backend, license, credentialStore } = setup({ canEncrypt: gate !== 'encryption' });
    license.isEnabled.mockReturnValue(gate !== 'security');
    await expect(backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID })).rejects.toMatchObject(
      { output: { statusCode: 403 } }
    );
    expect(credentialStore.getDecrypted).not.toHaveBeenCalled();
  });

  it('refuses missing stored credentials', async () => {
    const { backend, credentialStore, exchange } = setup();
    credentialStore.getDecrypted.mockResolvedValue(null);
    await expect(backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID })).rejects.toMatchObject(
      { retryable: false }
    );
    expect(exchange).not.toHaveBeenCalled();
  });

  it.each(['serviceAccountId', 'namespace', 'name', 'tokenName'] as const)(
    'logs the expected and actual %s when refusing inconsistent credentials',
    async (field) => {
      const { backend, credentialStore, exchange, logger } = setup();
      credentialStore.getDecrypted.mockResolvedValue({ ...credential, [field]: 'unexpected' });
      await expect(
        backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID })
      ).rejects.toMatchObject({ retryable: false });
      expect(exchange).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Stored credential for service account [${ACCOUNT_ID}] is inconsistent (${field}: expected ${JSON.stringify(
          credential[field]
        )}, got "unexpected").`
      );
      expect(JSON.stringify(logger.error.mock.calls)).not.toContain(credential.token);
    }
  );

  it.each([400, 401, 403, 404])(
    'classifies HTTP %s as terminal without logging secrets',
    async (statusCode) => {
      const { backend, exchange, logger } = setup();
      const cause = Boom.boomify(new Error(credential.token), { statusCode });
      exchange.mockRejectedValue(cause);
      await expect(
        backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID })
      ).rejects.toMatchObject({
        message: 'Error occurred during service account token exchange.',
        retryable: false,
      });
      expect(JSON.stringify(logger.error.mock.calls)).not.toContain(credential.token);
    }
  );

  it.each([408, 429, 500, 502, 503, 504])('classifies HTTP %s as retryable', async (statusCode) => {
    const { backend, exchange } = setup();
    exchange.mockRejectedValue(Boom.boomify(new Error('unavailable'), { statusCode }));
    await expect(backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID })).rejects.toMatchObject(
      { retryable: true }
    );
  });

  it.each([new errors.ConnectionError('disconnected'), new errors.TimeoutError('timeout')])(
    'retries ES transport failures',
    async (error) => {
      const { backend, exchange } = setup();
      exchange.mockRejectedValue(error);
      await expect(
        backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID })
      ).rejects.toMatchObject({ retryable: true });
    }
  );

  it.each([
    [400, false],
    [401, false],
    [403, false],
    [404, false],
    [408, true],
    [429, true],
    [500, true],
    [502, true],
    [503, true],
    [504, true],
  ])('classifies an ES ResponseError with status %s', async (statusCode, retryable) => {
    const { backend, exchange } = setup();
    exchange.mockRejectedValue(
      new errors.ResponseError(
        securityMock.createApiResponse({
          statusCode,
          body: { error: 'exchange failed' },
          headers: { 'retry-after': '12' },
        })
      )
    );
    await expect(backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID })).rejects.toMatchObject(
      { retryable, retryAfterMs: retryable ? 12000 : 0 }
    );
  });

  it('backs off when the ES connection pool has no living connections', async () => {
    const { backend, exchange } = setup();
    exchange.mockRejectedValue(
      new errors.NoLivingConnectionsError(
        'unavailable',
        securityMock.createApiResponse({ body: {} })
      )
    );
    await expect(backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID })).rejects.toMatchObject(
      { retryable: true }
    );
  });

  it('permanently stops renewal when ES rejects a disabled or revoked credential', async () => {
    const { backend, exchange } = setup();
    const request = await backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID });
    jest.advanceTimersByTime(10000);
    exchange.mockRejectedValueOnce(
      new errors.ResponseError(
        securityMock.createApiResponse({ statusCode: 401, body: { error: 'security_exception' } })
      )
    );
    await expect(backend.reauthenticateFakeRequest(request)).resolves.toBeNull();
    jest.advanceTimersByTime(60000);
    await expect(backend.reauthenticateFakeRequest(request)).resolves.toBeNull();
    expect(exchange).toHaveBeenCalledTimes(2);
  });

  it('coalesces concurrent renewal and decrypts the current credential again', async () => {
    const { backend, exchange, credentialStore } = setup();
    const request = await backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID });
    jest.advanceTimersByTime(10_000);
    credentialStore.getDecrypted.mockResolvedValue({ ...credential, token: 'rotated-secret' });
    // @ts-expect-error not full SecurityGetTokenResponse
    exchange.mockResponse({ ...exchangeResponse, access_token: 'new-token' });
    const responses = await Promise.all(
      Array.from({ length: 4 }, () => backend.reauthenticateFakeRequest(request))
    );
    expect(responses).toEqual(Array(4).fill({ authorization: 'Bearer new-token' }));
    expect(exchange).toHaveBeenCalledTimes(2);
    expect(exchange).toHaveBeenLastCalledWith({
      grant_type: '_user_managed_service_account',
      service_account_token: 'rotated-secret',
    });
    expect(request.headers.authorization).toBe('Bearer new-token');
  });

  it('backs off a transient credential-store failure and recovers', async () => {
    const { backend, exchange, credentialStore } = setup();
    const request = await backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID });
    jest.advanceTimersByTime(10_000);
    credentialStore.getDecrypted.mockRejectedValueOnce(Boom.serverUnavailable());
    await expect(backend.reauthenticateFakeRequest(request)).resolves.toBeNull();
    await expect(backend.reauthenticateFakeRequest(request)).resolves.toBeNull();
    expect(credentialStore.getDecrypted).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(5_000);
    await expect(backend.reauthenticateFakeRequest(request)).resolves.toEqual({
      authorization: 'Bearer short-lived-secret',
    });
    expect(exchange).toHaveBeenCalledTimes(2);
  });

  it('honors Retry-After instead of repeatedly exchanging', async () => {
    const { backend, exchange } = setup();
    const request = await backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID });
    jest.advanceTimersByTime(10_000);
    const error = Boom.tooManyRequests();
    error.output.headers['retry-after'] = '30';
    exchange.mockRejectedValueOnce(error);
    await expect(backend.reauthenticateFakeRequest(request)).resolves.toBeNull();
    jest.advanceTimersByTime(29_000);
    await expect(backend.reauthenticateFakeRequest(request)).resolves.toBeNull();
    expect(exchange).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(1_000);
    await expect(backend.reauthenticateFakeRequest(request)).resolves.toEqual({
      authorization: 'Bearer short-lived-secret',
    });
  });

  it.each([
    Boom.forbidden('integrity failure'),
    Boom.notFound('removed'),
    new Error('unexpected failure'),
  ])('permanently stops renewal after a terminal credential-store failure', async (error) => {
    const { backend, credentialStore } = setup();
    const request = await backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID });
    jest.advanceTimersByTime(10_000);
    credentialStore.getDecrypted.mockRejectedValueOnce(error);
    await expect(backend.reauthenticateFakeRequest(request)).resolves.toBeNull();
    jest.advanceTimersByTime(60_000);
    await expect(backend.reauthenticateFakeRequest(request)).resolves.toBeNull();
    expect(credentialStore.getDecrypted).toHaveBeenCalledTimes(2);
  });

  it('ends renewal when the configured request lease expires', async () => {
    const { backend, exchange } = setup({ requestLifetimeMs: 1000 });
    const request = await backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID });
    jest.advanceTimersByTime(1000);
    await expect(backend.reauthenticateFakeRequest(request)).resolves.toBeNull();
    expect(exchange).toHaveBeenCalledTimes(1);
  });

  it('does not renew inbound or unrelated fake requests carrying the same bearer token', async () => {
    const { backend, exchange } = setup();
    for (const request of [
      httpServerMock.createKibanaRequest({
        headers: { authorization: 'Bearer short-lived-secret' },
      }),
      httpServerMock.createFakeKibanaRequest({
        headers: { authorization: 'Bearer short-lived-secret' },
      }),
    ]) {
      await expect(backend.reauthenticateFakeRequest(request)).resolves.toBeNull();
      backend.releaseFakeRequest(request);
      expect(request.headers.authorization).toBe('Bearer short-lived-secret');
    }
    expect(exchange).not.toHaveBeenCalled();
  });

  it('releases the request without remotely invalidating its issued token', async () => {
    const { backend, exchange, clusterClient } = setup();
    const request = await backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID });
    backend.releaseFakeRequest(request);
    backend.releaseFakeRequest(request);
    expect(request.headers.authorization).toBeUndefined();
    await expect(backend.reauthenticateFakeRequest(request)).resolves.toBeNull();
    expect(exchange).toHaveBeenCalledTimes(1);
    expect(clusterClient.asInternalUser.security.invalidateToken).not.toHaveBeenCalled();
  });

  it.each([
    ['message', false, 0],
    ['nestedCause', false, 0],
    ['boom', false, 0],
    ['connectionMetadata', true, 0],
    ['responseMetadata', true, 12000],
  ] as const)(
    'sanitizes %s before propagating an exchange failure',
    async (source, retryable, retryAfterMs) => {
      const { backend, exchange, logger } = setup();
      const response = securityMock.createApiResponse({
        statusCode: 503,
        headers: { 'retry-after': '12' },
        body: { error: { type: 'unavailable', reason: credential.token } },
      });
      response.meta.request = {
        id: 'exchange',
        options: {},
        params: {
          method: 'POST',
          path: '/_security/oauth2/token',
          body: JSON.stringify({ service_account_token: credential.token }),
        },
      };
      const sourceErrors = {
        message: new Error(credential.token),
        nestedCause: new Error('Exchange failed', { cause: new Error(credential.token) }),
        boom: Boom.forbidden(credential.token),
        connectionMetadata: new errors.ConnectionError('Disconnected', response),
        responseMetadata: new errors.ResponseError(response),
      };
      const sourceError = sourceErrors[source];
      expect(inspect(sourceError, { depth: null, customInspect: false })).toContain(
        credential.token
      );
      exchange.mockRejectedValue(sourceError);

      const failure = await backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID }).then(
        () => {
          throw new Error('Expected token exchange to fail');
        },
        (error: Error) => error
      );
      expect(failure).toBeInstanceOf(ServiceAccountTokenExchangeError);
      expect(failure).toMatchObject({ retryable, retryAfterMs });
      expect(failure.cause).not.toBe(sourceError);
      expect(getDetailedErrorMessage(failure)).not.toContain(credential.token);
      expect(
        inspect(failure, { depth: null, showHidden: true, customInspect: false })
      ).not.toContain(credential.token);
      expect(JSON.stringify(logger.error.mock.calls)).not.toContain(credential.token);
    }
  );

  describe('#getFakeRequestPrincipal', () => {
    it('describes a request this backend minted as an Elasticsearch service account', async () => {
      const { backend } = setup();
      const request = await backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID });

      expect(backend.getFakeRequestPrincipal(request)).toEqual({
        type: 'service_account',
        serviceAccountId: ACCOUNT_ID,
        variant: 'elasticsearch',
      });
    });

    it('returns null for requests this backend did not mint', () => {
      const { backend } = setup();

      expect(
        backend.getFakeRequestPrincipal(httpServerMock.createFakeKibanaRequest({}))
      ).toBeNull();
      expect(backend.getFakeRequestPrincipal(httpServerMock.createKibanaRequest())).toBeNull();
    });

    it('returns null once the request has been released', async () => {
      const { backend } = setup();
      const request = await backend.createFakeRequest({ serviceAccountId: ACCOUNT_ID });
      backend.releaseFakeRequest(request);

      expect(backend.getFakeRequestPrincipal(request)).toBeNull();
    });
  });
});
