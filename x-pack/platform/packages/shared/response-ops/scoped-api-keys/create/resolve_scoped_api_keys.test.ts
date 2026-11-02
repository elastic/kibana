/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { resolveScopedApiKeys } from './resolve_scoped_api_keys';
import type { ResolveScopedApiKeysOpts } from './types';

const b64 = (value: string) => Buffer.from(value).toString('base64');

const names = new Map([['rule', { es: 'my-rule', uiam: 'uiam-my-rule' }]]);
const metadata = { managed: true, kibana: { type: 'test' } };

const setup = ({
  authorization,
  user,
  fake = false,
}: {
  authorization?: string;
  user?: Partial<AuthenticatedUser>;
  fake?: boolean;
} = {}) => {
  const security = securityServiceMock.createStart();
  const logger = loggingSystemMock.createLogger();
  const headers: Record<string, string> = authorization ? { authorization } : {};
  const request = fake
    ? kibanaRequestFactory({ headers, path: '/' })
    : httpServerMock.createKibanaRequest({ headers });
  security.authc.getCurrentUser.mockReturnValue(
    user ? ({ username: 'elastic', ...user } as AuthenticatedUser) : null
  );
  security.authc.apiKeys.grantAsInternalUser.mockResolvedValue({
    id: 'es-id',
    name: 'my-rule',
    api_key: 'es-secret',
  });
  security.authc.apiKeys.cloneAsInternalUser.mockResolvedValue({
    id: 'clone-id',
    name: 'my-rule',
    api_key: 'clone-secret',
    encoded: b64('clone-id:clone-secret'),
  });
  security.authc.apiKeys.uiam!.grant.mockResolvedValue({
    id: 'uiam-id',
    name: 'uiam-my-rule',
    api_key: 'essu_granted',
  });
  return { security, logger, request, deps: { security, logger } };
};

const opts = (overrides: Partial<ResolveScopedApiKeysOpts> = {}): ResolveScopedApiKeysOpts => ({
  names,
  uiamEnabled: true,
  metadata,
  ...overrides,
});

const credentialsOf = (result: Awaited<ReturnType<typeof resolveScopedApiKeys>>) =>
  result.enabled ? result.credentials.get('rule') : undefined;

describe('resolveScopedApiKeys', () => {
  describe('grant (session request)', () => {
    test('grants an ES key only when UIAM is disabled', async () => {
      const { security, request, deps } = setup({ user: { authentication_type: 'realm' } });

      const result = await resolveScopedApiKeys(
        request,
        deps,
        opts({ uiamEnabled: false, refresh: false })
      );

      expect(credentialsOf(result)).toEqual({
        es: { id: 'es-id', secret: 'es-secret', name: 'my-rule' },
        createdByUser: false,
      });
      expect(security.authc.apiKeys.grantAsInternalUser).toHaveBeenCalledWith(
        request,
        { name: 'my-rule', role_descriptors: {}, metadata },
        { refresh: false }
      );
      expect(security.authc.apiKeys.uiam!.grant).not.toHaveBeenCalled();
    });

    test('grants UIAM first, then ES, and reports both keys', async () => {
      const { security, request, deps } = setup({
        authorization: 'Bearer essu_session',
        user: { authentication_type: 'realm' },
      });
      const onKeyCreated = jest.fn();

      const result = await resolveScopedApiKeys(request, deps, opts({ onKeyCreated }));

      expect(credentialsOf(result)).toEqual({
        es: { id: 'es-id', secret: 'es-secret', name: 'my-rule' },
        uiam: { id: 'uiam-id', secret: 'essu_granted', name: 'uiam-my-rule' },
        createdByUser: false,
      });
      expect(security.authc.apiKeys.uiam!.grant).toHaveBeenCalledWith(request, {
        name: 'uiam-my-rule',
      });
      expect(security.authc.apiKeys.uiam!.grant.mock.invocationCallOrder[0]).toBeLessThan(
        security.authc.apiKeys.grantAsInternalUser.mock.invocationCallOrder[0]
      );
      expect(onKeyCreated.mock.calls).toEqual([
        [{ apiKeyId: 'uiam-id', uiamApiKey: 'essu_granted' }],
        [{ apiKeyId: 'es-id' }],
      ]);
    });

    test('skips UIAM with a debug log when the request has no UIAM credentials', async () => {
      const { security, logger, request, deps } = setup({ user: { authentication_type: 'realm' } });

      const result = await resolveScopedApiKeys(
        request,
        deps,
        opts({ uiamRequired: true, logTags: { credentials: ['tag'] } })
      );

      expect(credentialsOf(result)?.uiam).toBeUndefined();
      expect(security.authc.apiKeys.uiam!.grant).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        'Request credential is not UIAM-compatible, skipping UIAM API key grant. Only ES API keys will be used.',
        { tags: ['tag'] }
      );
    });

    test('logs a failed UIAM grant and continues with ES when UIAM is not required', async () => {
      const { security, logger, request, deps } = setup({
        authorization: 'Bearer essu_session',
        user: { authentication_type: 'realm' },
      });
      security.authc.apiKeys.uiam!.grant.mockRejectedValue(new Error('boom'));

      const result = await resolveScopedApiKeys(request, deps, opts());

      expect(credentialsOf(result)).toEqual({
        es: { id: 'es-id', secret: 'es-secret', name: 'my-rule' },
        createdByUser: false,
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create UIAM API key "uiam-my-rule": boom',
        expect.any(Object)
      );
    });

    test('throws the UIAM error before granting ES when UIAM is required', async () => {
      const { security, request, deps } = setup({
        authorization: 'Bearer essu_session',
        user: { authentication_type: 'realm' },
      });
      security.authc.apiKeys.uiam!.grant.mockResolvedValue(null);

      await expect(
        resolveScopedApiKeys(request, deps, opts({ uiamRequired: true }))
      ).rejects.toThrow('Failed to create a Cloud API key "uiam-my-rule"');
      expect(security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    });

    test('rethrows the ES error after reporting the granted UIAM key', async () => {
      const { security, request, deps } = setup({
        authorization: 'Bearer essu_session',
        user: { authentication_type: 'realm' },
      });
      security.authc.apiKeys.grantAsInternalUser.mockRejectedValue(new Error('es down'));
      const onKeyCreated = jest.fn();

      await expect(resolveScopedApiKeys(request, deps, opts({ onKeyCreated }))).rejects.toThrow(
        'es down'
      );
      expect(onKeyCreated).toHaveBeenCalledWith({
        apiKeyId: 'uiam-id',
        uiamApiKey: 'essu_granted',
      });
    });

    test('returns disabled when the ES grant returns null', async () => {
      const { security, request, deps } = setup({ user: { authentication_type: 'realm' } });
      security.authc.apiKeys.grantAsInternalUser.mockResolvedValue(null);

      expect(await resolveScopedApiKeys(request, deps, opts())).toEqual({ enabled: false });
    });

    test('mints one key set per entry', async () => {
      const { security, request, deps } = setup({ user: { authentication_type: 'realm' } });
      const twoNames = new Map([
        ['a', { es: 'es-a', uiam: 'uiam-a' }],
        ['b', { es: 'es-b', uiam: 'uiam-b' }],
      ]);

      const result = await resolveScopedApiKeys(request, deps, opts({ names: twoNames }));

      expect(result.enabled && [...result.credentials.keys()]).toEqual(['a', 'b']);
      expect(security.authc.apiKeys.grantAsInternalUser).toHaveBeenCalledTimes(2);
    });

    test.each([
      [
        'UIAM when enabled',
        true,
        { uiam: { id: 'uiam-id', secret: 'essu_granted', name: 'uiam-my-rule' } },
      ],
      [
        'ES when UIAM is disabled',
        false,
        { es: { id: 'es-id', secret: 'es-secret', name: 'my-rule' } },
      ],
    ])('single storage grants %s', async (_, uiamEnabled, expected) => {
      const { request, deps } = setup({
        authorization: 'Bearer essu_session',
        user: { authentication_type: 'realm' },
      });

      const result = await resolveScopedApiKeys(
        request,
        deps,
        opts({ storage: 'single', uiamEnabled })
      );

      expect(credentialsOf(result)).toEqual({ ...expected, createdByUser: false });
    });

    test('single storage leaves a session request without an authorization header to the UIAM grant', async () => {
      const { security, request, deps } = setup({ user: { authentication_type: 'realm' } });

      const result = await resolveScopedApiKeys(request, deps, opts({ storage: 'single' }));

      expect(security.authc.apiKeys.uiam?.grant).toHaveBeenCalledTimes(1);
      expect(credentialsOf(result)).toEqual({
        uiam: { id: 'uiam-id', secret: 'essu_granted', name: 'uiam-my-rule' },
        createdByUser: false,
      });
    });
  });

  describe('reuse (API key request)', () => {
    const apiKeyUser = { authentication_type: 'api_key' };

    test('reuses an ES key', async () => {
      const { security, request, deps } = setup({
        authorization: `ApiKey ${b64('es-id:es-secret')}`,
        user: apiKeyUser,
      });

      const result = await resolveScopedApiKeys(request, deps, opts());

      expect(credentialsOf(result)).toEqual({
        es: { id: 'es-id', secret: 'es-secret' },
        createdByUser: true,
      });
      expect(security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    });

    test('reuses a base64(id:essu_) key as UIAM only', async () => {
      const { request, deps } = setup({
        authorization: `ApiKey ${b64('uiam-id:essu_secret')}`,
        user: apiKeyUser,
      });

      const result = await resolveScopedApiKeys(request, deps, opts());

      expect(credentialsOf(result)).toEqual({
        uiam: { id: 'uiam-id', secret: 'essu_secret' },
        createdByUser: true,
      });
    });

    test('reuses a raw essu_ key with the external verdict', async () => {
      const { request, deps } = setup({
        authorization: 'ApiKey essu_raw',
        user: {
          ...apiKeyUser,
          api_key: { id: 'x', name: 'x', internal: false } as AuthenticatedUser['api_key'],
        },
      });

      const result = await resolveScopedApiKeys(request, deps, opts());

      expect(credentialsOf(result)).toEqual({
        uiam: { secret: 'essu_raw' },
        createdByUser: true,
        uiamExternal: true,
      });
    });

    test('rejects a UIAM key with a 400 when UIAM is disabled', async () => {
      const { request, deps } = setup({ authorization: 'ApiKey essu_raw', user: apiKeyUser });

      await expect(
        resolveScopedApiKeys(request, deps, opts({ uiamEnabled: false }))
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
    });

    test('rejects an unparsable key with a 400', async () => {
      const { request, deps } = setup({
        authorization: `ApiKey ${b64('no-colon')}`,
        user: apiKeyUser,
      });

      await expect(resolveScopedApiKeys(request, deps, opts())).rejects.toMatchObject({
        output: { statusCode: 400 },
      });
    });
  });

  describe('clone', () => {
    test('clones an ES key when asked', async () => {
      const { security, request, deps } = setup({
        authorization: `ApiKey ${b64('es-id:es-secret')}`,
        user: { authentication_type: 'api_key' },
      });

      const result = await resolveScopedApiKeys(request, deps, opts({ clone: true }));

      expect(credentialsOf(result)).toEqual({
        es: { id: 'clone-id', secret: 'clone-secret', name: 'my-rule' },
        createdByUser: false,
      });
      expect(security.authc.apiKeys.cloneAsInternalUser).toHaveBeenCalledWith(request, {
        name: 'my-rule',
        metadata,
      });
    });

    test('always clones a fake request', async () => {
      const { security, request, deps } = setup({
        authorization: `ApiKey ${b64('es-id:es-secret')}`,
        fake: true,
      });

      const result = await resolveScopedApiKeys(request, deps, opts());

      expect(credentialsOf(result)?.createdByUser).toBe(false);
      expect(security.authc.apiKeys.cloneAsInternalUser).toHaveBeenCalled();
    });

    test.each([
      ['a raw essu_ key', 'ApiKey essu_raw'],
      ['a base64(id:essu_) key', `ApiKey ${b64('uiam-id:essu_secret')}`],
    ])('grants a fresh UIAM key instead of cloning %s', async (_, authorization) => {
      const { security, request, deps } = setup({
        authorization,
        user: { authentication_type: 'api_key' },
      });

      const result = await resolveScopedApiKeys(request, deps, opts({ clone: true }));

      expect(credentialsOf(result)).toEqual({
        uiam: { id: 'uiam-id', secret: 'essu_granted', name: 'uiam-my-rule' },
        createdByUser: false,
      });
      expect(security.authc.apiKeys.cloneAsInternalUser).not.toHaveBeenCalled();
    });
  });

  describe('UIAM service account', () => {
    const asServiceAccount = (security: ReturnType<typeof setup>['security']) =>
      security.authc.getPrincipal.mockReturnValue({
        type: 'service_account',
        variant: 'uiam',
      } as ReturnType<typeof security.authc.getPrincipal>);

    test('gets a UIAM key only', async () => {
      const { security, request, deps } = setup({ authorization: 'Bearer essu_sa' });
      asServiceAccount(security);

      const result = await resolveScopedApiKeys(request, deps, opts());

      expect(credentialsOf(result)).toEqual({
        uiam: { id: 'uiam-id', secret: 'essu_granted', name: 'uiam-my-rule' },
        createdByUser: false,
      });
      expect(security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    });

    test('fails when UIAM is disabled', async () => {
      const { security, request, deps } = setup({ authorization: 'Bearer essu_sa' });
      asServiceAccount(security);

      await expect(
        resolveScopedApiKeys(request, deps, opts({ uiamEnabled: false }))
      ).rejects.toThrow('Failed to create UIAM API key "uiam-my-rule": UIAM is not enabled');
    });
  });

  test('a forced mode overrides the request kind', async () => {
    const { security, request, deps } = setup({
      authorization: `ApiKey ${b64('es-id:es-secret')}`,
      user: { authentication_type: 'api_key' },
    });

    await resolveScopedApiKeys(request, deps, opts({ mode: 'grant', uiamEnabled: false }));

    expect(security.authc.apiKeys.grantAsInternalUser).toHaveBeenCalled();
  });
});
