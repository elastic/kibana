/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OAuthAuthorizationService } from './oauth_authorization_service';
import { actionsClientMock } from '../actions_client/actions_client.mock';
import { createMockConnector } from '../application/connector/mocks';

const mockActionsClient = actionsClientMock.create();

const mockEncryptedSavedObjectsClient = {
  getDecryptedAsInternalUser: jest.fn(),
};

const createService = (kibanaBaseUrl = 'https://kibana.example.com') =>
  new OAuthAuthorizationService({
    actionsClient: mockActionsClient as never,
    encryptedSavedObjectsClient: mockEncryptedSavedObjectsClient as never,
    kibanaBaseUrl,
  });

describe('OAuthAuthorizationService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getOAuthConfig', () => {
    it('returns OAuth config from decrypted secrets', async () => {
      const service = createService();
      const getResult = createMockConnector({
        id: 'connector-1',
        config: { authType: 'oauth_authorization_code' },
      });
      mockActionsClient.get.mockResolvedValue(getResult);
      mockEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
        attributes: {
          secrets: {
            authorizationUrl: 'https://provider.example.com/authorize',
            clientId: 'secret-client-id',
            scope: 'openid email',
          },
          config: {},
        },
      });

      const result = await service.getOAuthConfig('connector-1', undefined);

      expect(result).toEqual({
        authorizationUrl: 'https://provider.example.com/authorize',
        clientId: 'secret-client-id',
        scope: 'openid email',
      });
      expect(mockActionsClient.get).toHaveBeenCalledWith({ id: 'connector-1' });
      expect(mockEncryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
        'action',
        'connector-1',
        { namespace: undefined }
      );
    });

    it('falls back to config when secrets are missing fields', async () => {
      const service = createService();
      const getResult = createMockConnector({
        id: 'connector-1',
        config: {
          authType: 'oauth_authorization_code',
          authorizationUrl: 'https://config-provider.example.com/authorize',
          clientId: 'config-client-id',
          scope: 'profile',
        },
      });
      mockActionsClient.get.mockResolvedValue(getResult);
      mockEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
        attributes: {
          secrets: {},
          config: {
            authorizationUrl: 'https://config-provider.example.com/authorize',
            clientId: 'config-client-id',
            scope: 'profile',
          },
        },
      });

      const result = await service.getOAuthConfig('connector-1', undefined);

      expect(result).toEqual({
        authorizationUrl: 'https://config-provider.example.com/authorize',
        clientId: 'config-client-id',
        scope: 'profile',
      });
    });

    it('supports auth.type for OAuth validation', async () => {
      const service = createService();
      const getResult = createMockConnector({
        id: 'connector-1',
        config: { auth: { type: 'oauth_authorization_code' } },
      });
      mockActionsClient.get.mockResolvedValue(getResult);
      mockEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
        attributes: {
          secrets: {
            authorizationUrl: 'https://provider.example.com/authorize',
            clientId: 'client-id',
          },
          config: {},
        },
      });

      const result = await service.getOAuthConfig('connector-1', undefined);

      expect(result).toEqual({
        authorizationUrl: 'https://provider.example.com/authorize',
        clientId: 'client-id',
        scope: undefined,
      });
    });

    it('passes namespace when provided', async () => {
      const service = createService();
      const getResult = createMockConnector({
        id: 'connector-1',
        config: { authType: 'oauth_authorization_code' },
      });
      mockActionsClient.get.mockResolvedValue(getResult);
      mockEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
        attributes: {
          secrets: {
            authorizationUrl: 'https://provider.example.com/authorize',
            clientId: 'client-id',
          },
          config: {},
        },
      });

      await service.getOAuthConfig('connector-1', 'custom-namespace');

      expect(mockEncryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
        'action',
        'connector-1',
        { namespace: 'custom-namespace' }
      );
    });

    it('throws when connector does not use OAuth Authorization Code flow', async () => {
      const service = createService();
      const getResult = createMockConnector({
        id: 'connector-1',
        config: { authType: 'basic' },
      });
      mockActionsClient.get.mockResolvedValue(getResult);

      await expect(service.getOAuthConfig('connector-1', undefined)).rejects.toThrow(
        'Connector does not use OAuth Authorization Code flow'
      );
    });

    it('throws when missing required OAuth config (authorizationUrl)', async () => {
      const service = createService();
      const getResult = createMockConnector({
        id: 'connector-1',
        config: { authType: 'oauth_authorization_code' },
      });
      mockActionsClient.get.mockResolvedValue(getResult);
      mockEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
        attributes: {
          secrets: { clientId: 'client-id' },
          config: {},
        },
      });

      await expect(service.getOAuthConfig('connector-1', undefined)).rejects.toThrow(
        'Connector missing required OAuth configuration (authorizationUrl, clientId)'
      );
    });

    it('throws when missing required OAuth config (clientId)', async () => {
      const service = createService();
      const getResult = createMockConnector({
        id: 'connector-1',
        config: { authType: 'oauth_authorization_code' },
      });
      mockActionsClient.get.mockResolvedValue(getResult);
      mockEncryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
        attributes: {
          secrets: { authorizationUrl: 'https://provider.example.com/authorize' },
          config: {},
        },
      });

      await expect(service.getOAuthConfig('connector-1', undefined)).rejects.toThrow(
        'Connector missing required OAuth configuration (authorizationUrl, clientId)'
      );
    });
  });

  describe('getRedirectUri', () => {
    it('returns the correct redirect URI', () => {
      const service = createService('https://kibana.example.com');

      expect(service.getRedirectUri()).toBe(
        'https://kibana.example.com/api/actions/connector/_oauth_callback'
      );
    });

    it('throws when kibanaBaseUrl is empty', () => {
      const service = createService('');

      expect(() => service.getRedirectUri()).toThrow(
        'Kibana public URL not configured. Please set server.publicBaseUrl in kibana.yml'
      );
    });
  });

  describe('buildAuthorizationUrl', () => {
    it('builds URL with all required parameters', () => {
      const service = createService();

      const url = service.buildAuthorizationUrl({
        baseAuthorizationUrl: 'https://provider.example.com/authorize',
        clientId: 'my-client-id',
        scope: 'openid email profile',
        redirectUri: 'https://kibana.example.com/api/actions/connector/_oauth_callback',
        state: 'random-state-value',
        codeChallenge: 'code-challenge-value',
      });

      const parsed = new URL(url);
      expect(parsed.origin).toBe('https://provider.example.com');
      expect(parsed.pathname).toBe('/authorize');
      expect(parsed.searchParams.get('client_id')).toBe('my-client-id');
      expect(parsed.searchParams.get('response_type')).toBe('code');
      expect(parsed.searchParams.get('redirect_uri')).toBe(
        'https://kibana.example.com/api/actions/connector/_oauth_callback'
      );
      expect(parsed.searchParams.get('state')).toBe('random-state-value');
      expect(parsed.searchParams.get('code_challenge')).toBe('code-challenge-value');
      expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
      expect(parsed.searchParams.get('scope')).toBe('openid email profile');
    });

    it('excludes scope when not provided', () => {
      const service = createService();

      const url = service.buildAuthorizationUrl({
        baseAuthorizationUrl: 'https://provider.example.com/authorize',
        clientId: 'my-client-id',
        redirectUri: 'https://kibana.example.com/callback',
        state: 'state-value',
        codeChallenge: 'challenge-value',
      });

      const parsed = new URL(url);
      expect(parsed.searchParams.has('scope')).toBe(false);
      expect(parsed.searchParams.get('client_id')).toBe('my-client-id');
    });
  });
});
