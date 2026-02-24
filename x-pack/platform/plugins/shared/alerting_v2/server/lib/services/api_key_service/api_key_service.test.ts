/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { ApiKeyService } from './api_key_service';

const createMockSecurityService = (
  overrides: {
    username?: string;
    authenticationType?: string;
    uiam?: boolean;
  } = {}
): jest.Mocked<SecurityServiceStart> => {
  const { username = 'test-user', authenticationType = 'token', uiam = false } = overrides;

  const grantAsInternalUser = jest.fn().mockResolvedValue({
    id: 'es-key-id',
    name: 'test-key',
    api_key: 'es-key-secret',
  });

  const uiamGrant = jest.fn().mockResolvedValue({
    id: 'uiam-key-id',
    name: 'uiam-test-key',
    api_key: 'uiam-key-secret',
  });

  const uiamInvalidate = jest.fn().mockResolvedValue({ invalidated_api_keys: ['uiam-key-id'] });

  return {
    authc: {
      getCurrentUser: jest.fn().mockReturnValue(
        username
          ? {
              username,
              authentication_type: authenticationType,
            }
          : null
      ),
      apiKeys: {
        grantAsInternalUser,
        ...(uiam
          ? {
              uiam: {
                grant: uiamGrant,
                invalidate: uiamInvalidate,
              },
            }
          : { uiam: undefined }),
      },
    },
  } as unknown as jest.Mocked<SecurityServiceStart>;
};

const createRequestWithApiKey = (id: string, key: string): KibanaRequest => {
  const encoded = Buffer.from(`${id}:${key}`).toString('base64');
  return httpServerMock.createKibanaRequest({
    headers: { authorization: `ApiKey ${encoded}` },
  });
};

describe('ApiKeyService', () => {
  describe('create (grant path - password/token auth)', () => {
    it('grants an ES API key and returns encoded attributes', async () => {
      const request = httpServerMock.createKibanaRequest();
      const security = createMockSecurityService();
      const service = new ApiKeyService(request, security);

      const result = await service.create('My Policy');

      expect(security.authc.apiKeys.grantAsInternalUser).toHaveBeenCalledWith(request, {
        name: 'My Policy',
        role_descriptors: {},
        metadata: { managed: true, kibana: { type: 'notification_policy' } },
      });

      expect(result.apiKey).toBe(Buffer.from('es-key-id:es-key-secret').toString('base64'));
      expect(result.uiamApiKey).toBeNull();
      expect(result.apiKeyOwner).toBe('test-user');
      expect(result.apiKeyCreatedByUser).toBe(false);
    });

    it('grants both ES and UIAM API keys when UIAM is available', async () => {
      const request = httpServerMock.createKibanaRequest();
      const security = createMockSecurityService({ uiam: true });
      const service = new ApiKeyService(request, security);

      const result = await service.create('My Policy');

      expect(security.authc.apiKeys.uiam!.grant).toHaveBeenCalledWith(request, {
        name: 'uiam-My Policy',
      });
      expect(security.authc.apiKeys.grantAsInternalUser).toHaveBeenCalled();

      expect(result.apiKey).toBe(Buffer.from('es-key-id:es-key-secret').toString('base64'));
      expect(result.uiamApiKey).toBe(Buffer.from('uiam-key-id:uiam-key-secret').toString('base64'));
      expect(result.apiKeyOwner).toBe('test-user');
      expect(result.apiKeyCreatedByUser).toBe(false);
    });

    it('throws when no current user is found', async () => {
      const request = httpServerMock.createKibanaRequest();
      const security = createMockSecurityService({ username: undefined });
      security.authc.getCurrentUser = jest.fn().mockReturnValue(null);
      const service = new ApiKeyService(request, security);

      await expect(service.create('My Policy')).rejects.toThrow(
        'Failed to create API key for notification policy: My Policy - unable to determine current user'
      );
    });

    it('throws when ES API key grant returns null', async () => {
      const request = httpServerMock.createKibanaRequest();
      const security = createMockSecurityService();
      security.authc.apiKeys.grantAsInternalUser = jest.fn().mockResolvedValue(null);
      const service = new ApiKeyService(request, security);

      await expect(service.create('My Policy')).rejects.toThrow(
        'Failed to create ES API key for notification policy: My Policy'
      );
    });

    it('throws when UIAM grant returns null', async () => {
      const request = httpServerMock.createKibanaRequest();
      const security = createMockSecurityService({ uiam: true });
      (security.authc.apiKeys.uiam!.grant as jest.Mock).mockResolvedValue(null);
      const service = new ApiKeyService(request, security);

      await expect(service.create('My Policy')).rejects.toThrow(
        'Failed to create UIAM API key for notification policy: My Policy'
      );
    });

    it('invalidates UIAM key if ES key grant fails', async () => {
      const request = httpServerMock.createKibanaRequest();
      const security = createMockSecurityService({ uiam: true });
      security.authc.apiKeys.grantAsInternalUser = jest
        .fn()
        .mockRejectedValue(new Error('ES grant failed'));
      const service = new ApiKeyService(request, security);

      await expect(service.create('My Policy')).rejects.toThrow('ES grant failed');

      expect(security.authc.apiKeys.uiam!.invalidate).toHaveBeenCalledWith(request, {
        id: 'uiam-key-id',
      });
    });
  });

  describe('create (reuse path - API key auth)', () => {
    it('extracts ES API key from authorization header', async () => {
      const request = createRequestWithApiKey('my-key-id', 'my-key-secret');
      const security = createMockSecurityService({ authenticationType: 'api_key' });
      const service = new ApiKeyService(request, security);

      const result = await service.create('My Policy');

      expect(security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
      expect(result.apiKey).toBe(Buffer.from('my-key-id:my-key-secret').toString('base64'));
      expect(result.uiamApiKey).toBeNull();
      expect(result.apiKeyOwner).toBe('test-user');
      expect(result.apiKeyCreatedByUser).toBe(true);
    });

    it('extracts UIAM API key from authorization header when UIAM is available', async () => {
      const uiamKey = 'essu_uiam-secret-value';
      const request = createRequestWithApiKey('uiam-id', uiamKey);
      const security = createMockSecurityService({
        authenticationType: 'api_key',
        uiam: true,
      });
      const service = new ApiKeyService(request, security);

      const result = await service.create('My Policy');

      const expectedEncoded = Buffer.from(`uiam-id:${uiamKey}`).toString('base64');
      expect(result.apiKey).toBe(expectedEncoded);
      expect(result.uiamApiKey).toBe(expectedEncoded);
      expect(result.apiKeyCreatedByUser).toBe(true);
    });

    it('throws when UIAM credential is used in non-serverless environment', async () => {
      const uiamKey = 'essu_uiam-secret-value';
      const request = createRequestWithApiKey('uiam-id', uiamKey);
      const security = createMockSecurityService({
        authenticationType: 'api_key',
        uiam: false,
      });
      const service = new ApiKeyService(request, security);

      await expect(service.create('My Policy')).rejects.toThrow(
        'UIAM API keys should only be used in serverless environments'
      );
    });

    it('throws when authorization header has no credentials', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const security = createMockSecurityService({ authenticationType: 'api_key' });
      const service = new ApiKeyService(request, security);

      await expect(service.create('My Policy')).rejects.toThrow(
        'Failed to extract API key from authorization header for notification policy: My Policy'
      );
    });
  });
});
