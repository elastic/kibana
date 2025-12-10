/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/logging';

import { UiamAPIKeys } from './uiam_api_keys';
import type { SecurityLicense } from '../../../../common';
import { licenseMock } from '../../../../common/licensing/index.mock';
import type { UiamServicePublic } from '../../../uiam';
import { HTTPAuthorizationHeader } from '../../http_authentication';

describe('UiamAPIKeys', () => {
  let uiamApiKeys: UiamAPIKeys;
  let mockClusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
  let mockScopedClusterClient: ReturnType<
    typeof elasticsearchServiceMock.createScopedClusterClient
  >;
  let mockLicense: jest.Mocked<SecurityLicense>;
  let mockUiam: jest.Mocked<UiamServicePublic>;
  let logger: Logger;

  beforeEach(() => {
    mockClusterClient = elasticsearchServiceMock.createClusterClient();
    mockScopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    mockClusterClient.asScoped.mockReturnValue(mockScopedClusterClient);

    mockLicense = licenseMock.create();
    mockLicense.isEnabled.mockReturnValue(true);

    logger = loggingSystemMock.create().get('uiam-api-keys');

    mockUiam = {
      getAuthenticationHeaders: jest.fn(),
      getUserProfileGrant: jest.fn(),
      getEsClientAuthenticationHeader: jest.fn().mockReturnValue({
        'x-client-authentication': 'shared-secret',
      }),
      refreshSessionTokens: jest.fn(),
      invalidateSessionTokens: jest.fn(),
      grantApiKey: jest.fn(),
      revokeApiKey: jest.fn(),
    };

    uiamApiKeys = new UiamAPIKeys({
      logger,
      clusterClient: mockClusterClient,
      license: mockLicense,
      uiam: mockUiam,
    });
  });

  describe('grantApiKey()', () => {
    const createMockRequest = (authHeader?: string): KibanaRequest => {
      return httpServerMock.createKibanaRequest({
        headers: authHeader ? { authorization: authHeader } : {},
      });
    };

    it('returns null when license is not enabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const request = createMockRequest('ApiKey test_key');

      const result = await uiamApiKeys.grantApiKey(request, {
        name: 'test-key',
      });

      expect(result).toBeNull();
      expect(mockUiam.grantApiKey).not.toHaveBeenCalled();
    });

    it('throws error when UIAM service is not available', async () => {
      const uiamApiKeysWithoutUiam = new UiamAPIKeys({
        logger,
        clusterClient: mockClusterClient,
        license: mockLicense,
      });

      const request = createMockRequest('ApiKey essu_test_key');

      await expect(
        uiamApiKeysWithoutUiam.grantApiKey(request, { name: 'test-key' })
      ).rejects.toThrow('UIAM service is not available.');
    });

    it('throws error when request does not contain authorization header', async () => {
      const request = createMockRequest();

      await expect(uiamApiKeys.grantApiKey(request, { name: 'test-key' })).rejects.toThrow(
        'Unable to determine if request has UIAM credentials, request does not contain an authorization header'
      );
    });

    it('reuses existing API key when credentials do not start with UIAM prefix', async () => {
      const request = createMockRequest('ApiKey regular_api_key_123');

      const result = await uiamApiKeys.grantApiKey(request, {
        name: 'test-key',
        expiration: '7d',
      });

      expect(result).toEqual({
        id: 'same_api_key_id',
        name: 'test-key',
        api_key: 'regular_api_key_123',
      });
      expect(mockUiam.grantApiKey).not.toHaveBeenCalled();
    });

    it('grants a new API key via UIAM when credentials start with UIAM prefix', async () => {
      const request = createMockRequest('ApiKey essu_uiam_credential_123');
      mockUiam.grantApiKey.mockResolvedValue({
        id: 'new_key_id',
        key: 'essu_new_key_value',
        description: 'My Test Key',
      });

      const result = await uiamApiKeys.grantApiKey(request, {
        name: 'test-key',
        expiration: '7d',
      });

      expect(result).toEqual({
        id: 'new_key_id',
        name: 'My Test Key',
        api_key: 'essu_new_key_value',
      });
      expect(mockUiam.grantApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          scheme: 'ApiKey',
          credentials: 'essu_uiam_credential_123',
        }),
        'test-key',
        '7d'
      );

      expect(logger.debug).toHaveBeenCalledWith('Trying to grant an API key via UIAM');
      expect(logger.debug).toHaveBeenCalledWith('Using authorization scheme: ApiKey');
      expect(logger.debug).toHaveBeenCalledWith('API key was granted successfully via UIAM');
    });

    it('grants API key without expiration when not provided', async () => {
      const request = createMockRequest('ApiKey essu_uiam_credential_123');
      mockUiam.grantApiKey.mockResolvedValue({
        id: 'new_key_id',
        key: 'essu_new_key_value',
        description: 'My Test Key',
      });

      const result = await uiamApiKeys.grantApiKey(request, {
        name: 'test-key',
      });

      expect(result).toEqual({
        id: 'new_key_id',
        name: 'My Test Key',
        api_key: 'essu_new_key_value',
      });
      expect(mockUiam.grantApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          scheme: 'ApiKey',
          credentials: 'essu_uiam_credential_123',
        }),
        'test-key',
        undefined
      );
    });

    it('logs and throws error when UIAM API key grant fails', async () => {
      const request = createMockRequest('ApiKey essu_uiam_credential_123');
      const error = new Error('UIAM service error');
      mockUiam.grantApiKey.mockRejectedValue(error);

      await expect(uiamApiKeys.grantApiKey(request, { name: 'test-key' })).rejects.toThrow(
        'UIAM service error'
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to grant API key via UIAM: UIAM service error'
      );
    });

    it('reuses existing token when using Bearer scheme without UIAM prefix', async () => {
      const request = createMockRequest('Bearer regular_bearer_token_123');

      const result = await uiamApiKeys.grantApiKey(request, {
        name: 'test-key',
        expiration: '7d',
      });

      expect(result).toEqual({
        id: 'same_api_key_id',
        name: 'test-key',
        api_key: 'regular_bearer_token_123',
      });
      expect(mockUiam.grantApiKey).not.toHaveBeenCalled();
    });

    it('grants a new API key via UIAM when using Bearer scheme with UIAM prefix', async () => {
      const request = createMockRequest('Bearer essu_uiam_bearer_token_123');
      mockUiam.grantApiKey.mockResolvedValue({
        id: 'new_bearer_key_id',
        key: 'essu_new_bearer_key_value',
        description: 'My Bearer Test Key',
      });

      const result = await uiamApiKeys.grantApiKey(request, {
        name: 'test-bearer-key',
        expiration: '30d',
      });

      expect(result).toEqual({
        id: 'new_bearer_key_id',
        name: 'My Bearer Test Key',
        api_key: 'essu_new_bearer_key_value',
      });
      expect(mockUiam.grantApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          scheme: 'Bearer',
          credentials: 'essu_uiam_bearer_token_123',
        }),
        'test-bearer-key',
        '30d'
      );
      expect(logger.debug).toHaveBeenCalledWith('Using authorization scheme: Bearer');
    });
  });

  describe('invalidateApiKey()', () => {
    const createMockRequest = (authHeader?: string): KibanaRequest => {
      return httpServerMock.createKibanaRequest({
        headers: authHeader ? { authorization: authHeader } : {},
      });
    };

    it('returns null when license is not enabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const request = createMockRequest('ApiKey essu_test_key');

      const result = await uiamApiKeys.invalidateApiKey(request, {
        id: 'key_id_123',
      });

      expect(result).toBeNull();
      expect(mockUiam.revokeApiKey).not.toHaveBeenCalled();
    });

    it('throws error when UIAM service is not available', async () => {
      const uiamApiKeysWithoutUiam = new UiamAPIKeys({
        logger,
        clusterClient: mockClusterClient,
        license: mockLicense,
      });

      const request = createMockRequest('ApiKey essu_test_key');

      await expect(
        uiamApiKeysWithoutUiam.invalidateApiKey(request, { id: 'key_id_123' })
      ).rejects.toThrow('UIAM service is not available.');
    });

    it('throws error when request does not contain authorization header', async () => {
      const request = createMockRequest();

      await expect(uiamApiKeys.invalidateApiKey(request, { id: 'key_id_123' })).rejects.toThrow(
        'Unable to determine if request has UIAM credentials, request does not contain an authorization header'
      );
    });

    it('throws error when credentials do not start with UIAM prefix', async () => {
      const request = createMockRequest('ApiKey regular_api_key_123');

      await expect(uiamApiKeys.invalidateApiKey(request, { id: 'key_id_123' })).rejects.toThrow(
        'Cannot invalidate API key via UIAM: not a UIAM API key'
      );
    });

    it('successfully invalidates a UIAM API key', async () => {
      const request = createMockRequest('ApiKey essu_uiam_credential_123');
      mockUiam.revokeApiKey.mockResolvedValue();

      const result = await uiamApiKeys.invalidateApiKey(request, {
        id: 'key_id_123',
      });

      expect(result).toEqual({
        invalidated_api_keys: ['key_id_123'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });
      expect(mockUiam.revokeApiKey).toHaveBeenCalledWith('key_id_123', 'essu_uiam_credential_123');
      expect(logger.debug).toHaveBeenCalledWith('Trying to invalidate API key key_id_123 via UIAM');
      expect(logger.debug).toHaveBeenCalledWith(
        'API key key_id_123 was invalidated successfully via UIAM'
      );
    });

    it('returns error details when UIAM API key invalidation fails', async () => {
      const request = createMockRequest('ApiKey essu_uiam_credential_123');
      const error = new Error('Revocation failed');
      mockUiam.revokeApiKey.mockRejectedValue(error);

      const result = await uiamApiKeys.invalidateApiKey(request, {
        id: 'key_id_123',
      });

      expect(result).toEqual({
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 1,
        error_details: [
          {
            type: 'exception',
            reason: 'Revocation failed',
          },
        ],
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to invalidate API key key_id_123 via UIAM: Revocation failed'
      );
    });
  });

  describe('getScopedClusterClientWithApiKey()', () => {
    it('returns null when license is not enabled', () => {
      mockLicense.isEnabled.mockReturnValue(false);

      const result = uiamApiKeys.getScopedClusterClientWithApiKey('essu_test_key');

      expect(result).toBeNull();
      expect(mockClusterClient.asScoped).not.toHaveBeenCalled();
    });

    it('throws error when UIAM service is not available', () => {
      const uiamApiKeysWithoutUiam = new UiamAPIKeys({
        logger,
        clusterClient: mockClusterClient,
        license: mockLicense,
      });

      expect(() =>
        uiamApiKeysWithoutUiam.getScopedClusterClientWithApiKey('essu_test_key')
      ).toThrow('UIAM service is not available.');
    });

    it('creates scoped client with UIAM headers when API key starts with UIAM prefix', () => {
      const result = uiamApiKeys.getScopedClusterClientWithApiKey('essu_test_key_123');

      expect(result).toBe(mockScopedClusterClient);
      expect(mockClusterClient.asScoped).toHaveBeenCalledWith({
        headers: {
          authorization: 'ApiKey essu_test_key_123',
          'x-client-authentication': 'shared-secret',
        },
      });
      expect(mockUiam.getEsClientAuthenticationHeader).toHaveBeenCalled();
    });

    it('creates scoped client without UIAM headers when API key does not start with UIAM prefix', () => {
      const result = uiamApiKeys.getScopedClusterClientWithApiKey('regular_api_key_123');

      expect(result).toBe(mockScopedClusterClient);
      expect(mockClusterClient.asScoped).toHaveBeenCalledWith({
        headers: {
          authorization: 'ApiKey regular_api_key_123',
        },
      });
      expect(mockUiam.getEsClientAuthenticationHeader).not.toHaveBeenCalled();
    });
  });

  describe('isUiamCredential()', () => {
    it('returns true when credentials start with UIAM prefix', () => {
      const authorization = new HTTPAuthorizationHeader('ApiKey', 'essu_credential_123');

      const result = UiamAPIKeys.isUiamCredential(authorization);

      expect(result).toBe(true);
    });

    it('returns false when credentials do not start with UIAM prefix', () => {
      const authorization = new HTTPAuthorizationHeader('ApiKey', 'regular_credential_123');

      const result = UiamAPIKeys.isUiamCredential(authorization);

      expect(result).toBe(false);
    });

    it('returns false when credentials are empty', () => {
      const authorization = new HTTPAuthorizationHeader('ApiKey', '');

      const result = UiamAPIKeys.isUiamCredential(authorization);

      expect(result).toBe(false);
    });
  });

  describe('getAuthorizationHeader()', () => {
    it('extracts authorization header from request', () => {
      const request = httpServerMock.createKibanaRequest({
        headers: {
          authorization: 'Bearer test_token_123',
        },
      });

      const result = UiamAPIKeys.getAuthorizationHeader(request);

      expect(result).toBeInstanceOf(HTTPAuthorizationHeader);
      expect(result.scheme).toBe('Bearer');
      expect(result.credentials).toBe('test_token_123');
    });

    it('throws error when authorization header is missing', () => {
      const request = httpServerMock.createKibanaRequest();

      expect(() => UiamAPIKeys.getAuthorizationHeader(request)).toThrow(
        'Unable to determine if request has UIAM credentials, request does not contain an authorization header'
      );
    });

    it('handles ApiKey scheme correctly', () => {
      const request = httpServerMock.createKibanaRequest({
        headers: {
          authorization: 'ApiKey essu_key_value',
        },
      });

      const result = UiamAPIKeys.getAuthorizationHeader(request);

      expect(result.scheme).toBe('ApiKey');
      expect(result.credentials).toBe('essu_key_value');
    });
  });
});
