/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { securityServiceMock } from '@kbn/core-security-server-mocks';
import { ApiKeysClient } from './client';
import { UiamUnavailableError } from './errors';
import { encodeApiKey } from './stored_keys';

const ES_GRANT = { id: 'es-id', name: 'key', api_key: 'es-secret' };
const ES_CLONE = { ...ES_GRANT, encoded: 'encoded' };
const UIAM_GRANT = { id: 'uiam-id', name: 'uiam-key', api_key: 'essu_granted' };
const METADATA = { managed: true };
const SUBJECT = 'test thing : key';
const UIAM_TAGS = (tag: string) => ['serverless', 'test-plugin', 'uiam', tag];

const setup = ({
  authorization,
  uiamEnabled = true,
  serviceAccount = false,
}: { authorization?: string; uiamEnabled?: boolean; serviceAccount?: boolean } = {}) => {
  const security = securityServiceMock.createStart();
  const uiam = { grant: jest.fn().mockResolvedValue(UIAM_GRANT), invalidate: jest.fn() };
  security.authc.apiKeys.uiam = uiam as never;
  security.authc.apiKeys.grantAsInternalUser.mockResolvedValue(ES_GRANT);
  security.authc.apiKeys.cloneAsInternalUser.mockResolvedValue(ES_CLONE);
  if (serviceAccount) {
    security.authc.getPrincipal.mockReturnValue({
      type: 'service_account',
      serviceAccountId: 'sa',
      variant: 'uiam',
    });
  }
  const logger = loggingSystemMock.createLogger();
  const client = new ApiKeysClient({ security, logger, pluginTag: 'test-plugin', uiamEnabled });
  const request = httpServerMock.createKibanaRequest({
    headers: authorization ? { authorization } : {},
  });
  return { client, security, uiam, logger, request };
};

const options = { name: 'key', metadata: METADATA, subject: SUBJECT, uiam: 'optional' } as const;

describe('ApiKeysClient', () => {
  describe('grant', () => {
    test('grants an ES key and a UIAM key for a UIAM request', async () => {
      const { client, security, uiam, request } = setup({ authorization: 'Bearer essu_token' });

      await expect(client.grant(request, { ...options, refresh: 'wait_for' })).resolves.toEqual({
        es: ES_GRANT,
        uiam: UIAM_GRANT,
      });
      expect(uiam.grant).toHaveBeenCalledWith(request, { name: 'uiam-key' });
      expect(security.authc.apiKeys.grantAsInternalUser).toHaveBeenCalledWith(
        request,
        { name: 'key', role_descriptors: {}, metadata: METADATA },
        { refresh: 'wait_for' }
      );
    });

    test('grants only an ES key and logs for a request without UIAM credentials', async () => {
      const { client, uiam, logger, request } = setup({ authorization: 'Basic abc' });

      await expect(client.grant(request, options)).resolves.toEqual({ es: ES_GRANT });
      expect(uiam.grant).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to create UIAM API key for ${SUBJECT}: Invalid or missing UIAM credentials`,
        { tags: UIAM_TAGS('uiam-api-key-invalid-credentials') }
      );
    });

    test('skips UIAM silently when it is disabled', async () => {
      const { client, uiam, logger, request } = setup({
        authorization: 'Bearer essu_token',
        uiamEnabled: false,
      });

      await expect(client.grant(request, options)).resolves.toEqual({ es: ES_GRANT });
      expect(uiam.grant).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    test('logs and continues when an optional UIAM grant fails', async () => {
      const { client, uiam, logger, request } = setup({ authorization: 'Bearer essu_token' });
      const failure = new Error('boom');
      uiam.grant.mockRejectedValueOnce(failure);

      await expect(client.grant(request, options)).resolves.toEqual({ es: ES_GRANT });
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to create UIAM API key for ${SUBJECT}: boom`,
        { tags: UIAM_TAGS('uiam-api-key-grant'), error: { stack_trace: failure.stack } }
      );
    });

    test('throws when a required UIAM grant fails', async () => {
      const { client, uiam, security, request } = setup({ authorization: 'Bearer essu_token' });
      uiam.grant.mockResolvedValueOnce(null);

      await expect(client.grant(request, { ...options, uiam: 'required' })).rejects.toThrow(
        `Failed to create a Cloud API key for ${SUBJECT}`
      );
      expect(security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    });

    test('rolls back the UIAM key when the ES grant fails', async () => {
      const { client, uiam, security, request } = setup({ authorization: 'Bearer essu_token' });
      const failure = new Error('es down');
      security.authc.apiKeys.grantAsInternalUser.mockRejectedValueOnce(failure);

      await expect(client.grant(request, options)).rejects.toBe(failure);
      expect(uiam.invalidate).toHaveBeenCalledWith(request, { id: 'uiam-id' });
    });

    test('rolls back the UIAM key and returns null when API keys are disabled', async () => {
      const { client, uiam, security, request } = setup({ authorization: 'Bearer essu_token' });
      security.authc.apiKeys.grantAsInternalUser.mockResolvedValueOnce(null);

      await expect(client.grant(request, options)).resolves.toBeNull();
      expect(uiam.invalidate).toHaveBeenCalledWith(request, { id: 'uiam-id' });
    });

    test('grants only a UIAM key for a UIAM service account', async () => {
      const { client, security, request } = setup({
        authorization: 'Bearer essu_token',
        serviceAccount: true,
      });

      await expect(client.grant(request, options)).resolves.toEqual({ uiam: UIAM_GRANT });
      expect(security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
    });

    test('throws UiamUnavailableError for a service account when UIAM is disabled', async () => {
      const { client, request } = setup({
        authorization: 'Bearer essu_token',
        serviceAccount: true,
        uiamEnabled: false,
      });

      const error = await client.grant(request, options).catch((e) => e);
      expect(error).toBeInstanceOf(UiamUnavailableError);
      expect(error.message).toBe(
        `Failed to create UIAM API key for ${SUBJECT}: UIAM is not enabled`
      );
    });
  });

  describe('clone', () => {
    test('clones an ES key', async () => {
      const { client, security, request } = setup({
        authorization: `ApiKey ${encodeApiKey('id', 'secret')}`,
      });

      await expect(client.clone(request, options)).resolves.toEqual({ es: ES_CLONE });
      expect(security.authc.apiKeys.cloneAsInternalUser).toHaveBeenCalledWith(request, {
        name: 'key',
        metadata: METADATA,
      });
    });

    test('throws when the clone returns null', async () => {
      const { client, security, request } = setup({ authorization: 'ApiKey abc' });
      security.authc.apiKeys.cloneAsInternalUser.mockResolvedValueOnce(null);

      await expect(client.clone(request, options)).rejects.toThrow(
        'API key clone returned null (security feature may be disabled)'
      );
    });

    test('grants a UIAM key instead for a UIAM request', async () => {
      const { client, security, request } = setup({ authorization: 'ApiKey essu_user' });

      await expect(client.clone(request, options)).resolves.toEqual({ uiam: UIAM_GRANT });
      expect(security.authc.apiKeys.cloneAsInternalUser).not.toHaveBeenCalled();
    });

    test('returns no keys for a UIAM request when UIAM is disabled', async () => {
      const { client, request } = setup({ authorization: 'ApiKey essu_user', uiamEnabled: false });

      await expect(client.clone(request, options)).resolves.toEqual({});
    });
  });

  describe('fromRequest', () => {
    test.each([
      ['no credentials', undefined, null],
      [
        'an ES key',
        `ApiKey ${encodeApiKey('id', 'secret')}`,
        { type: 'es', id: 'id', secret: 'secret' },
      ],
      [
        'a base64(id:essu_) key',
        `ApiKey ${encodeApiKey('id', 'essu_secret')}`,
        { type: 'uiam', id: 'id', secret: 'essu_secret', external: false },
      ],
      ['a raw essu_ key', 'ApiKey essu_raw', { type: 'uiam', secret: 'essu_raw', external: false }],
      [
        'an unparseable credential',
        `ApiKey ${Buffer.from('nocolon').toString('base64')}`,
        { type: 'invalid' },
      ],
    ])('parses %s', (_, authorization, expected) => {
      const { client, request } = setup({ authorization });

      expect(client.fromRequest(request)).toEqual(expected);
    });

    test('reports UIAM external keys', () => {
      const { client, security, request } = setup({ authorization: 'ApiKey essu_raw' });
      security.authc.getCurrentUser.mockReturnValue(
        securityServiceMock.createMockAuthenticatedUser({
          api_key: { id: 'id', name: 'n', managed_by: 'cloud', internal: false },
        })
      );

      expect(client.fromRequest(request)).toEqual({
        type: 'uiam',
        secret: 'essu_raw',
        external: true,
      });
    });
  });
});
