/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrantAPIKeyResult, SecurityServiceStart } from '@kbn/core-security-server';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { ApiKeysClient } from './client';
import { chooseApiKeySource } from './create/choose_source';
import type { ApiKeysProfile } from './create/types';
import { CloudApiKeyNotSupportedError, UiamUnavailableError } from './errors';
import { encodeApiKey } from './store/api_keys';

const subject = 'my thing';
const name = 'my-key';
const esGrant: GrantAPIKeyResult = { id: 'es-id', name, api_key: 'es-secret' };
const uiamGrant: GrantAPIKeyResult = { id: 'uiam-id', name, api_key: 'essu_granted' };
const esKeys = { id: 'es-id', encoded: encodeApiKey('es-id', 'es-secret') };
const uiamKeys = { id: 'uiam-id', secret: 'essu_granted', external: false };
const callerEsKey = encodeApiKey('caller-id', 'caller-secret');
const callerEnvelopedUiamKey = encodeApiKey('caller-uiam-id', 'essu_caller');
const metadata = { managed: true };

type CurrentUser = NonNullable<ReturnType<SecurityServiceStart['authc']['getCurrentUser']>>;

const request = (authorization?: string) =>
  httpServerMock.createKibanaRequest({ headers: authorization ? { authorization } : {} });

const setup = (profile: Partial<ApiKeysProfile> = {}, { uiamEnabled = true } = {}) => {
  const security = securityServiceMock.createStart();
  const logger = loggerMock.create();
  const client = new ApiKeysClient({
    security,
    logger,
    profile: { pluginTag: 'test', uiam: 'optional', reuse: true, metadata, ...profile },
    uiamEnabled,
  });
  const { grantAsInternalUser, cloneAsInternalUser, invalidateAsInternalUser, uiam } =
    security.authc.apiKeys;
  if (!uiam) {
    throw new Error('The security mock has no UIAM API keys');
  }
  grantAsInternalUser.mockResolvedValue(esGrant);
  cloneAsInternalUser.mockResolvedValue({ ...esGrant, encoded: esKeys.encoded });
  uiam.grant.mockResolvedValue(uiamGrant);
  uiam.invalidate.mockResolvedValue({
    invalidated_api_keys: ['uiam-id'],
    previously_invalidated_api_keys: [],
    error_count: 0,
  });
  invalidateAsInternalUser.mockResolvedValue({
    invalidated_api_keys: ['es-id'],
    previously_invalidated_api_keys: [],
    error_count: 0,
  });
  const setCurrentUser = (user: Partial<CurrentUser>) =>
    security.authc.getCurrentUser.mockReturnValue(user as CurrentUser);
  return {
    client,
    security,
    logger,
    apiKeys: { grantAsInternalUser, cloneAsInternalUser, invalidateAsInternalUser, uiam },
    setCurrentUser,
  };
};

const tags = (type: string) => ['serverless', 'test', 'uiam', type];

describe('chooseApiKeySource', () => {
  it.each([
    [{ apiKeyAuthenticated: false, clone: true, reuse: true }, 'grant'],
    [{ apiKeyAuthenticated: true, clone: false, reuse: true }, 'reuse'],
    [{ apiKeyAuthenticated: true, clone: true, reuse: true }, 'clone'],
    [{ apiKeyAuthenticated: true, clone: false, reuse: false }, 'clone'],
  ])('%j is %s', (input, expected) => {
    expect(chooseApiKeySource(input)).toBe(expected);
  });
});

describe('ApiKeysClient', () => {
  describe('isApiKeyAuthenticated', () => {
    it('uses the authentication type of the current user', () => {
      const { client, setCurrentUser } = setup();
      setCurrentUser({ authentication_type: 'realm' });

      expect(client.isApiKeyAuthenticated(request(`ApiKey ${callerEsKey}`))).toBe(false);
    });

    it.each([
      [`ApiKey ${callerEsKey}`, true],
      ['Bearer token', false],
    ])('falls back to the scheme of %s', (authorization, expected) => {
      const { client } = setup();

      expect(client.isApiKeyAuthenticated(request(authorization))).toBe(expected);
    });
  });

  describe('grant', () => {
    it('grants an ES key when the request has no UIAM credentials and UIAM is disabled', async () => {
      const { client, apiKeys, logger } = setup({}, { uiamEnabled: false });
      const req = request('Basic dXNlcjpwYXNz');

      await expect(client.grant(req, { name, subject })).resolves.toEqual({
        createdByUser: false,
        es: esKeys,
      });
      expect(apiKeys.grantAsInternalUser).toHaveBeenCalledWith(
        req,
        { name, role_descriptors: {}, metadata },
        {}
      );
      expect(apiKeys.uiam.grant).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs missing UIAM credentials at the profile level and still grants an ES key', async () => {
      const { client, logger } = setup({ missingUiamCredentialsLogLevel: 'debug' });

      await expect(client.grant(request('Basic dXNlcjpwYXNz'), { name, subject })).resolves.toEqual(
        { createdByUser: false, es: esKeys }
      );
      expect(logger.debug).toHaveBeenCalledWith(
        `Failed to create UIAM API key for ${subject}: Invalid or missing UIAM credentials`,
        { tags: tags('uiam-api-key-invalid-credentials') }
      );
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('grants a UIAM key, then an ES key, reporting each as it is created', async () => {
      const { client, apiKeys } = setup();
      const onKeyCreated = jest.fn();
      const req = request('Bearer essu_session');

      await expect(
        client.grant(req, {
          name,
          subject,
          uiamName: 'uiam-name',
          refresh: 'wait_for',
          onKeyCreated,
        })
      ).resolves.toEqual({ createdByUser: false, es: esKeys, uiam: uiamKeys });
      expect(apiKeys.uiam.grant).toHaveBeenCalledWith(req, { name: 'uiam-name' });
      expect(apiKeys.grantAsInternalUser).toHaveBeenCalledWith(req, expect.anything(), {
        refresh: 'wait_for',
      });
      expect(onKeyCreated.mock.calls).toEqual([
        ['uiam', uiamGrant],
        ['es', esGrant],
      ]);
    });

    it('names the UIAM key after the ES key by default', async () => {
      const { client, apiKeys } = setup();

      await client.grant(request('Bearer essu_session'), { name, subject });

      expect(apiKeys.uiam.grant).toHaveBeenCalledWith(expect.anything(), { name: `uiam-${name}` });
    });

    it('grants only an ES key when the call is ES only', async () => {
      const { client, apiKeys } = setup();

      await expect(
        client.grant(request('Bearer essu_session'), { name, subject, esOnly: true })
      ).resolves.toEqual({ createdByUser: false, es: esKeys });
      expect(apiKeys.uiam.grant).not.toHaveBeenCalled();
    });

    it('logs a failed optional UIAM grant and still grants an ES key', async () => {
      const { client, apiKeys, logger } = setup();
      apiKeys.uiam.grant.mockRejectedValue(new Error('boom'));

      await expect(
        client.grant(request('Bearer essu_session'), { name, subject })
      ).resolves.toEqual({ createdByUser: false, es: esKeys });
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to create UIAM API key for ${subject}: boom`,
        expect.objectContaining({ tags: tags('uiam-api-key-grant') })
      );
    });

    it('treats a null UIAM grant as a failure', async () => {
      const { client, apiKeys, logger } = setup();
      apiKeys.uiam.grant.mockResolvedValue(null);

      await client.grant(request('Bearer essu_session'), { name, subject });

      expect(logger.error).toHaveBeenCalledWith(
        `Failed to create UIAM API key for ${subject}: Failed to create a Cloud API key for ${subject}`,
        expect.anything()
      );
    });

    it('fails when a required UIAM grant fails', async () => {
      const { client, apiKeys } = setup({ uiam: 'required' });
      apiKeys.uiam.grant.mockRejectedValue(new Error('boom'));

      await expect(client.grant(request('Bearer essu_session'), { name, subject })).rejects.toThrow(
        'boom'
      );
      expect(apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    });

    it('rolls back the UIAM key and keeps the ES error when the ES grant throws', async () => {
      const { client, apiKeys, logger } = setup();
      apiKeys.grantAsInternalUser.mockRejectedValue(new Error('es failed'));
      apiKeys.uiam.invalidate.mockRejectedValue(new Error('rollback failed'));

      await expect(client.grant(request('Bearer essu_session'), { name, subject })).rejects.toThrow(
        'es failed'
      );
      expect(apiKeys.uiam.invalidate).toHaveBeenCalledWith(expect.anything(), { id: 'uiam-id' });
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to invalidate UIAM API key for ${subject}: rollback failed`,
        expect.objectContaining({ tags: tags('uiam-api-key-invalidate') })
      );
    });

    it('rolls back the UIAM key and returns null when API keys are disabled', async () => {
      const { client, apiKeys } = setup();
      apiKeys.grantAsInternalUser.mockResolvedValue(null);

      await expect(client.grant(request('Bearer essu_session'), { name, subject })).resolves.toBe(
        null
      );
      expect(apiKeys.uiam.invalidate).toHaveBeenCalledWith(expect.anything(), { id: 'uiam-id' });
    });

    it('grants only a UIAM key in `only` mode', async () => {
      const { client, apiKeys } = setup({ uiam: 'only' });

      await expect(
        client.grant(request('Bearer essu_session'), { name, subject })
      ).resolves.toEqual({ createdByUser: false, uiam: uiamKeys });
      expect(apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    });

    it('fails in `only` mode when the request has no UIAM credentials', async () => {
      const { client, apiKeys } = setup({ uiam: 'only' });

      await expect(client.grant(request('Basic dXNlcjpwYXNz'), { name, subject })).rejects.toThrow(
        UiamUnavailableError
      );
      expect(apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    });

    it('grants only an ES key in `only` mode when UIAM is disabled', async () => {
      const { client } = setup({ uiam: 'only' }, { uiamEnabled: false });

      await expect(client.grant(request('Basic dXNlcjpwYXNz'), { name, subject })).resolves.toEqual(
        { createdByUser: false, es: esKeys }
      );
    });

    it('grants only a UIAM key to a UIAM service account', async () => {
      const { client, security, apiKeys } = setup();
      security.authc.getPrincipal.mockReturnValue({
        type: 'service_account',
        variant: 'uiam',
      } as ReturnType<typeof security.authc.getPrincipal>);

      await expect(
        client.grant(request('Bearer essu_session'), { name, subject })
      ).resolves.toEqual({ createdByUser: false, uiam: uiamKeys });
      expect(apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    });
  });

  describe('clone', () => {
    it('clones the caller ES key', async () => {
      const { client, apiKeys } = setup();
      const req = request(`ApiKey ${callerEsKey}`);

      await expect(client.clone(req, { name, subject, refresh: true })).resolves.toEqual({
        createdByUser: false,
        es: esKeys,
      });
      expect(apiKeys.cloneAsInternalUser).toHaveBeenCalledWith(req, {
        name,
        metadata,
        refresh: true,
      });
    });

    it('clones an enveloped UIAM key through ES', async () => {
      const { client, apiKeys } = setup();

      await client.clone(request(`ApiKey ${callerEnvelopedUiamKey}`), { name, subject });

      expect(apiKeys.cloneAsInternalUser).toHaveBeenCalled();
      expect(apiKeys.uiam.grant).not.toHaveBeenCalled();
    });

    it('fails when the clone returns null', async () => {
      const { client, apiKeys } = setup();
      apiKeys.cloneAsInternalUser.mockResolvedValue(null);

      await expect(
        client.clone(request(`ApiKey ${callerEsKey}`), { name, subject })
      ).rejects.toThrow('API key clone returned null (security feature may be disabled)');
    });

    it('grants a UIAM key for a caller authenticated with a raw UIAM key', async () => {
      const { client, apiKeys } = setup();

      await expect(client.clone(request('ApiKey essu_caller'), { name, subject })).resolves.toEqual(
        {
          createdByUser: false,
          uiam: uiamKeys,
        }
      );
      expect(apiKeys.cloneAsInternalUser).not.toHaveBeenCalled();
    });

    it('fails when the UIAM key for a raw UIAM caller cannot be granted', async () => {
      const { client, apiKeys } = setup();
      apiKeys.uiam.grant.mockRejectedValue(new Error('boom'));

      await expect(client.clone(request('ApiKey essu_caller'), { name, subject })).rejects.toThrow(
        new UiamUnavailableError(`Failed to grant UIAM API key for ${subject}`)
      );
    });

    it('rejects a raw UIAM caller when UIAM is disabled', async () => {
      const { client } = setup({}, { uiamEnabled: false });

      await expect(client.clone(request('ApiKey essu_caller'), { name, subject })).rejects.toThrow(
        CloudApiKeyNotSupportedError
      );
    });
  });

  describe('reuse', () => {
    it.each([undefined, 'Bearer token'])(
      'fails without an API key header (%s)',
      (authorization) => {
        const { client } = setup();

        expect(() => client.reuse(request(authorization), { subject })).toThrow(
          `Failed to extract API key from authorization header for ${subject}`
        );
      }
    );

    it('fails when the API key cannot be decoded', () => {
      const { client } = setup();

      expect(() => client.reuse(request('ApiKey not-an-api-key'), { subject })).toThrow(
        `Failed to parse API key credentials from authorization header for ${subject}`
      );
    });

    it('reuses an ES key', () => {
      const { client } = setup();

      expect(client.reuse(request(`ApiKey ${callerEsKey}`), { subject })).toEqual({
        createdByUser: true,
        es: { id: 'caller-id', encoded: callerEsKey },
      });
    });

    it('reuses a raw UIAM key, keeping the external verdict', () => {
      const { client, setCurrentUser } = setup();
      setCurrentUser({
        api_key: { id: 'x', name: 'x', internal: false } as CurrentUser['api_key'],
      });

      expect(client.reuse(request('ApiKey essu_caller'), { subject })).toEqual({
        createdByUser: true,
        uiam: { secret: 'essu_caller', external: true },
      });
    });

    it('reuses an enveloped UIAM key with its id', () => {
      const { client } = setup();

      expect(client.reuse(request(`ApiKey ${callerEnvelopedUiamKey}`), { subject })).toEqual({
        createdByUser: true,
        uiam: { id: 'caller-uiam-id', secret: 'essu_caller', external: false },
      });
    });

    it.each(['essu_caller', callerEnvelopedUiamKey])(
      'rejects UIAM key %s when UIAM is disabled',
      (credential) => {
        const { client } = setup({}, { uiamEnabled: false });

        expect(() => client.reuse(request(`ApiKey ${credential}`), { subject })).toThrow(
          new CloudApiKeyNotSupportedError(subject)
        );
      }
    );
  });

  describe('resolve', () => {
    it('reuses the caller key when the plugin reuses keys', async () => {
      const { client, setCurrentUser } = setup();
      setCurrentUser({ authentication_type: 'api_key' });

      await expect(
        client.resolve(request(`ApiKey ${callerEsKey}`), { name, subject })
      ).resolves.toEqual({ createdByUser: true, es: { id: 'caller-id', encoded: callerEsKey } });
    });

    it('clones a borrowed caller key', async () => {
      const { client, apiKeys, setCurrentUser } = setup();
      setCurrentUser({ authentication_type: 'api_key' });

      await client.resolve(request(`ApiKey ${callerEsKey}`), { name, subject, clone: true });

      expect(apiKeys.cloneAsInternalUser).toHaveBeenCalled();
    });

    it('clones the caller key when the plugin never reuses keys', async () => {
      const { client, apiKeys, setCurrentUser } = setup({ reuse: false });
      setCurrentUser({ authentication_type: 'api_key' });

      await client.resolve(request(`ApiKey ${callerEsKey}`), { name, subject });

      expect(apiKeys.cloneAsInternalUser).toHaveBeenCalled();
    });

    it('grants keys for a caller not authenticated with an API key', async () => {
      const { client, apiKeys, setCurrentUser } = setup();
      setCurrentUser({ authentication_type: 'realm' });

      await client.resolve(request('Basic dXNlcjpwYXNz'), { name, subject, clone: true });

      expect(apiKeys.grantAsInternalUser).toHaveBeenCalled();
    });
  });

  describe('invalidateNow', () => {
    it('never invalidates keys the user created', async () => {
      const { client, apiKeys } = setup();

      await expect(
        client.invalidateNow({ createdByUser: true, es: esKeys, uiam: uiamKeys }, { subject })
      ).resolves.toEqual([]);
      expect(apiKeys.invalidateAsInternalUser).not.toHaveBeenCalled();
      expect(apiKeys.uiam.invalidate).not.toHaveBeenCalled();
    });

    it('invalidates ES and UIAM keys, authenticating the UIAM call with the key itself', async () => {
      const { client, apiKeys } = setup();

      await expect(
        client.invalidateNow({ createdByUser: false, es: esKeys, uiam: uiamKeys }, { subject })
      ).resolves.toEqual([]);
      expect(apiKeys.invalidateAsInternalUser).toHaveBeenCalledWith({ ids: ['es-id'] });
      const [uiamRequest, params] = apiKeys.uiam.invalidate.mock.calls[0];
      expect(uiamRequest.headers.authorization).toBe('ApiKey essu_granted');
      expect(params).toEqual({ id: 'uiam-id' });
    });

    it('returns every key that could not be invalidated', async () => {
      const { client, apiKeys, logger } = setup();
      apiKeys.invalidateAsInternalUser.mockResolvedValue({
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 1,
        error_details: [{ type: 'error', reason: 'es reason' }],
      });
      apiKeys.uiam.invalidate.mockRejectedValue(new Error('uiam failed'));

      await expect(
        client.invalidateNow({ createdByUser: false, es: esKeys, uiam: uiamKeys }, { subject })
      ).resolves.toEqual([
        { apiKeyId: 'uiam-id', uiamApiKey: 'essu_granted' },
        { apiKeyId: 'es-id' },
      ]);
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to synchronously invalidate ES API key for ${subject}: es reason`
      );
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to synchronously invalidate UIAM API key for ${subject}: uiam failed`,
        expect.objectContaining({ tags: tags('uiam-api-key-invalidate') })
      );
    });

    it('returns an ES key Elasticsearch did not find yet', async () => {
      const { client, apiKeys, logger } = setup();
      apiKeys.invalidateAsInternalUser.mockResolvedValue({
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });

      await expect(
        client.invalidateNow({ createdByUser: false, es: esKeys }, { subject })
      ).resolves.toEqual([{ apiKeyId: 'es-id' }]);
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('logs a UIAM key without an id instead of invalidating it', async () => {
      const { client, apiKeys, logger } = setup();

      await expect(
        client.invalidateNow(
          { createdByUser: false, uiam: { secret: 'essu_x', external: false } },
          { subject }
        )
      ).resolves.toEqual([]);
      expect(apiKeys.uiam.invalidate).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to synchronously invalidate UIAM API key for ${subject}: stored credential is not a UIAM API key`,
        { tags: tags('uiam-api-key-invalidate') }
      );
    });
  });
});
