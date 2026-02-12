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
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import type { Logger } from '@kbn/logging';

import { UiamAPIKeys } from './uiam_api_keys';
import type { SecurityLicense } from '../../../../common';
import { licenseMock } from '../../../../common/licensing/index.mock';
import type { UiamServicePublic } from '../../../uiam';

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
      getClientAuthentication: jest.fn(),
      refreshSessionTokens: jest.fn(),
      invalidateSessionTokens: jest.fn(),
      grantApiKey: jest.fn(),
      revokeApiKey: jest.fn(),
    };

    uiamApiKeys = new UiamAPIKeys({
      logger,
      license: mockLicense,
      uiam: mockUiam,
    });
  });

  describe('grant()', () => {
    const createMockRequest = (authHeader?: string): KibanaRequest => {
      return httpServerMock.createKibanaRequest({
        headers: authHeader ? { authorization: authHeader } : {},
      });
    };

    it('returns null when license is not enabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const request = createMockRequest('ApiKey test_key');

      const result = await uiamApiKeys.grant(request, {
        name: 'test-key',
      });

      expect(result).toBeNull();
      expect(mockUiam.grantApiKey).not.toHaveBeenCalled();
    });

    it('throws error when request does not contain authorization header', async () => {
      const request = createMockRequest();

      await expect(uiamApiKeys.grant(request, { name: 'test-key' })).rejects.toThrow(
        'Unable to determine if request has UIAM credentials, request does not contain an authorization header'
      );
    });

    it('throws error when credentials do not start with UIAM prefix', async () => {
      const request = createMockRequest('ApiKey regular_api_key_123');

      await expect(
        uiamApiKeys.grant(request, {
          name: 'test-key',
          expiration: '7d',
        })
      ).rejects.toThrow('Cannot grant API key: provided credential is not compatible with UIAM');

      expect(mockUiam.grantApiKey).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Cannot grant API key: provided credential is not compatible with UIAM'
      );
    });

    it('grants a new API key via UIAM when credentials start with UIAM prefix', async () => {
      const request = createMockRequest('ApiKey essu_uiam_credential_123');
      mockUiam.grantApiKey.mockResolvedValue({
        id: 'new_key_id',
        key: 'essu_new_key_value',
        description: 'My Test Key',
      });

      const result = await uiamApiKeys.grant(request, {
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
        {
          name: 'test-key',
          expiration: '7d',
        }
      );

      expect(logger.debug).toHaveBeenCalledWith('Trying to grant an API key');
      expect(logger.debug).toHaveBeenCalledWith('Using authorization scheme: ApiKey');
      expect(logger.debug).toHaveBeenCalledWith('API key was granted successfully');
    });

    it('grants API key without expiration when not provided', async () => {
      const request = createMockRequest('ApiKey essu_uiam_credential_123');
      mockUiam.grantApiKey.mockResolvedValue({
        id: 'new_key_id',
        key: 'essu_new_key_value',
        description: 'My Test Key',
      });

      const result = await uiamApiKeys.grant(request, {
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
        {
          name: 'test-key',
        }
      );
    });

    it('logs and throws error when UIAM API key grant fails', async () => {
      const request = createMockRequest('ApiKey essu_uiam_credential_123');
      const error = new Error('UIAM service error');
      mockUiam.grantApiKey.mockRejectedValue(error);

      await expect(uiamApiKeys.grant(request, { name: 'test-key' })).rejects.toThrow(
        'UIAM service error'
      );

      expect(logger.error).toHaveBeenCalledWith('Failed to grant API key: UIAM service error');
    });

    it('throws error when using Bearer scheme without UIAM prefix', async () => {
      const request = createMockRequest('Bearer regular_bearer_token_123');

      await expect(
        uiamApiKeys.grant(request, {
          name: 'test-key',
          expiration: '7d',
        })
      ).rejects.toThrow('Cannot grant API key: provided credential is not compatible with UIAM');

      expect(mockUiam.grantApiKey).not.toHaveBeenCalled();
    });

    it('grants a new API key via UIAM when using Bearer scheme with UIAM prefix', async () => {
      const request = createMockRequest('Bearer essu_uiam_bearer_token_123');
      mockUiam.grantApiKey.mockResolvedValue({
        id: 'new_bearer_key_id',
        key: 'essu_new_bearer_key_value',
        description: 'My Bearer Test Key',
      });

      const result = await uiamApiKeys.grant(request, {
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
        {
          name: 'test-bearer-key',
          expiration: '30d',
        }
      );
      expect(logger.debug).toHaveBeenCalledWith('Using authorization scheme: Bearer');
    });
  });

  describe('invalidate()', () => {
    const createMockRequest = (authHeader?: string): KibanaRequest => {
      return httpServerMock.createKibanaRequest({
        headers: authHeader ? { authorization: authHeader } : {},
      });
    };

    it('returns null when license is not enabled', async () => {
      mockLicense.isEnabled.mockReturnValue(false);
      const request = createMockRequest('ApiKey essu_test_key');

      const result = await uiamApiKeys.invalidate(request, {
        id: 'key_id_123',
      });

      expect(result).toBeNull();
      expect(mockUiam.revokeApiKey).not.toHaveBeenCalled();
    });

    it('throws error when request does not contain authorization header', async () => {
      const request = createMockRequest();

      await expect(uiamApiKeys.invalidate(request, { id: 'key_id_123' })).rejects.toThrow(
        'Unable to determine if request has UIAM credentials, request does not contain an authorization header'
      );
    });

    it('throws error when credentials do not start with UIAM prefix', async () => {
      const request = createMockRequest('ApiKey regular_api_key_123');

      await expect(uiamApiKeys.invalidate(request, { id: 'key_id_123' })).rejects.toThrow(
        'Cannot invalidate API key: not a UIAM API key'
      );
    });

    it('successfully invalidates a UIAM API key', async () => {
      const request = createMockRequest('ApiKey essu_uiam_credential_123');
      mockUiam.revokeApiKey.mockResolvedValue();

      const result = await uiamApiKeys.invalidate(request, {
        id: 'key_id_123',
      });

      expect(result).toEqual({
        invalidated_api_keys: ['key_id_123'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });
      expect(mockUiam.revokeApiKey).toHaveBeenCalledWith('key_id_123', 'essu_uiam_credential_123');
      expect(logger.debug).toHaveBeenCalledWith('Trying to invalidate API key key_id_123');
      expect(logger.debug).toHaveBeenCalledWith('API key key_id_123 was invalidated successfully');
    });

    it('returns error details when UIAM API key invalidation fails', async () => {
      const request = createMockRequest('ApiKey essu_uiam_credential_123');
      const error = new Error('Revocation failed');
      mockUiam.revokeApiKey.mockRejectedValue(error);

      const result = await uiamApiKeys.invalidate(request, {
        id: 'key_id_123',
      });

      expect(result).toEqual({
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 1,
        error_details: [
          {
            type: 'exception',
            reason: 'Failed to invalidate API key key_id_123: Revocation failed',
          },
        ],
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to invalidate API key key_id_123: Revocation failed'
      );
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
