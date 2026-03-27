/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '../../../saved_objects';
import { ApiKeyService } from './api_key_service';

const createMockInvalidationDeps = () => ({
  invalidationSavedObjectsClient: savedObjectsClientMock.create(),
  logger: loggingSystemMock.create().get(),
});

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
    it('grants an ES API key when UIAM is not available', async () => {
      const request = httpServerMock.createKibanaRequest();
      const security = createMockSecurityService();
      const { invalidationSavedObjectsClient, logger } = createMockInvalidationDeps();
      const service = new ApiKeyService(request, security, invalidationSavedObjectsClient, logger);

      const result = await service.create('My Policy');

      expect(security.authc.apiKeys.grantAsInternalUser).toHaveBeenCalledWith(request, {
        name: 'My Policy',
        role_descriptors: {},
        metadata: { managed: true, kibana: { type: 'notification_policy' } },
      });

      expect(result.apiKey).toBe(Buffer.from('es-key-id:es-key-secret').toString('base64'));
      expect(result.owner).toBe('test-user');
      expect(result.createdByUser).toBe(false);
    });

    it('grants only a UIAM API key when UIAM is available', async () => {
      const request = httpServerMock.createKibanaRequest();
      const security = createMockSecurityService({ uiam: true });
      const { invalidationSavedObjectsClient, logger } = createMockInvalidationDeps();
      const service = new ApiKeyService(request, security, invalidationSavedObjectsClient, logger);

      const result = await service.create('My Policy');

      expect(security.authc.apiKeys.uiam!.grant).toHaveBeenCalledWith(request, {
        name: 'uiam-My Policy',
      });
      expect(security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();

      expect(result.apiKey).toBe(Buffer.from('uiam-key-id:uiam-key-secret').toString('base64'));
      expect(result.owner).toBe('test-user');
      expect(result.createdByUser).toBe(false);
    });

    it('throws when no current user is found', async () => {
      const request = httpServerMock.createKibanaRequest();
      const security = createMockSecurityService({ username: undefined });
      security.authc.getCurrentUser = jest.fn().mockReturnValue(null);
      const { invalidationSavedObjectsClient, logger } = createMockInvalidationDeps();
      const service = new ApiKeyService(request, security, invalidationSavedObjectsClient, logger);

      await expect(service.create('My Policy')).rejects.toThrow(
        'Failed to create API key for notification policy: My Policy - unable to determine current user'
      );
    });

    it('throws when ES API key grant returns null', async () => {
      const request = httpServerMock.createKibanaRequest();
      const security = createMockSecurityService();
      security.authc.apiKeys.grantAsInternalUser = jest.fn().mockResolvedValue(null);
      const { invalidationSavedObjectsClient, logger } = createMockInvalidationDeps();
      const service = new ApiKeyService(request, security, invalidationSavedObjectsClient, logger);

      await expect(service.create('My Policy')).rejects.toThrow(
        'Failed to create ES API key for notification policy: My Policy'
      );
    });

    it('throws when UIAM grant returns null', async () => {
      const request = httpServerMock.createKibanaRequest();
      const security = createMockSecurityService({ uiam: true });
      (security.authc.apiKeys.uiam!.grant as jest.Mock).mockResolvedValue(null);
      const { invalidationSavedObjectsClient, logger } = createMockInvalidationDeps();
      const service = new ApiKeyService(request, security, invalidationSavedObjectsClient, logger);

      await expect(service.create('My Policy')).rejects.toThrow(
        'Failed to create UIAM API key for notification policy: My Policy'
      );
    });
  });

  describe('create (reuse path - API key auth)', () => {
    it('extracts ES API key from authorization header', async () => {
      const request = createRequestWithApiKey('my-key-id', 'my-key-secret');
      const security = createMockSecurityService({ authenticationType: 'api_key' });
      const { invalidationSavedObjectsClient, logger } = createMockInvalidationDeps();
      const service = new ApiKeyService(request, security, invalidationSavedObjectsClient, logger);

      const result = await service.create('My Policy');

      expect(security.authc.apiKeys.grantAsInternalUser).not.toHaveBeenCalled();
      expect(result.apiKey).toBe(Buffer.from('my-key-id:my-key-secret').toString('base64'));
      expect(result.owner).toBe('test-user');
      expect(result.createdByUser).toBe(true);
    });

    it('extracts UIAM API key from authorization header when UIAM is available', async () => {
      const uiamKey = 'essu_uiam-secret-value';
      const request = createRequestWithApiKey('uiam-id', uiamKey);
      const security = createMockSecurityService({
        authenticationType: 'api_key',
        uiam: true,
      });
      const { invalidationSavedObjectsClient, logger } = createMockInvalidationDeps();
      const service = new ApiKeyService(request, security, invalidationSavedObjectsClient, logger);

      const result = await service.create('My Policy');

      const expectedEncoded = Buffer.from(`uiam-id:${uiamKey}`).toString('base64');
      expect(result.apiKey).toBe(expectedEncoded);
      expect(result.createdByUser).toBe(true);
    });

    it('throws when UIAM credential is used in non-serverless environment', async () => {
      const uiamKey = 'essu_uiam-secret-value';
      const request = createRequestWithApiKey('uiam-id', uiamKey);
      const security = createMockSecurityService({
        authenticationType: 'api_key',
        uiam: false,
      });
      const { invalidationSavedObjectsClient, logger } = createMockInvalidationDeps();
      const service = new ApiKeyService(request, security, invalidationSavedObjectsClient, logger);

      await expect(service.create('My Policy')).rejects.toThrow(
        'UIAM API keys should only be used in serverless environments'
      );
    });

    it('throws when authorization header has no credentials', async () => {
      const request = httpServerMock.createKibanaRequest({ headers: {} });
      const security = createMockSecurityService({ authenticationType: 'api_key' });
      const { invalidationSavedObjectsClient, logger } = createMockInvalidationDeps();
      const service = new ApiKeyService(request, security, invalidationSavedObjectsClient, logger);

      await expect(service.create('My Policy')).rejects.toThrow(
        'Failed to extract API key from authorization header for notification policy: My Policy'
      );
    });
  });

  describe('markApiKeysForInvalidation', () => {
    const request = httpServerMock.createKibanaRequest();
    const security = createMockSecurityService();
    const logger = loggingSystemMock.create().get();
    let invalidationSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;

    beforeEach(() => {
      jest.clearAllMocks();
      invalidationSavedObjectsClient = savedObjectsClientMock.create();
      invalidationSavedObjectsClient.bulkCreate = jest.fn().mockResolvedValue({
        saved_objects: [],
      });
    });

    it('does not call bulkCreate when apiKeys is empty', async () => {
      const service = new ApiKeyService(request, security, invalidationSavedObjectsClient, logger);

      await service.markApiKeysForInvalidation([]);

      expect(invalidationSavedObjectsClient.bulkCreate).not.toHaveBeenCalled();
    });

    it('calls bulkCreate with decoded apiKeyId and createdAt for each key', async () => {
      const service = new ApiKeyService(request, security, invalidationSavedObjectsClient, logger);
      const apiKeys = [
        Buffer.from('123').toString('base64'),
        Buffer.from('id123:essu_uiam_value').toString('base64'),
      ];

      await service.markApiKeysForInvalidation(apiKeys);

      expect(invalidationSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      const [savedObjects] = invalidationSavedObjectsClient.bulkCreate.mock.calls[0];
      expect(savedObjects).toHaveLength(2);
      expect(savedObjects[0]).toMatchObject({
        type: API_KEY_PENDING_INVALIDATION_TYPE,
        attributes: { apiKeyId: '123', createdAt: expect.any(String) },
      });
      expect(savedObjects[1]).toMatchObject({
        type: API_KEY_PENDING_INVALIDATION_TYPE,
        attributes: {
          apiKeyId: 'id123',
          uiamApiKey: 'essu_uiam_value',
          createdAt: expect.any(String),
        },
      });
    });

    it('includes uiamApiKey for UIAM credentials', async () => {
      const service = new ApiKeyService(request, security, invalidationSavedObjectsClient, logger);
      const apiKeys = [Buffer.from('id123:essu_uiam_value').toString('base64')];

      await service.markApiKeysForInvalidation(apiKeys);
      expect(invalidationSavedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      const [savedObjects] = invalidationSavedObjectsClient.bulkCreate.mock.calls[0];
      expect(savedObjects[0].attributes).toMatchObject({
        apiKeyId: 'id123',
        uiamApiKey: 'essu_uiam_value',
        createdAt: expect.any(String),
      });
    });

    it('logs error and does not throw when bulkCreate fails', async () => {
      const err = new Error('bulkCreate failed');
      invalidationSavedObjectsClient.bulkCreate = jest.fn().mockRejectedValue(err);
      const service = new ApiKeyService(request, security, invalidationSavedObjectsClient, logger);
      const apiKeys = [Buffer.from('123').toString('base64')];

      await expect(service.markApiKeysForInvalidation(apiKeys)).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to bulk mark list of API keys ["MTIz"] for invalidation: bulkCreate failed',
        { error: { stack_trace: err.stack } }
      );
    });
  });
});
