/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import undici from 'undici';

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';

import {
  type GrantUiamApiKeyRequestBody,
  type GrantUiamApiKeyResponse,
  type OAuthClientResponse,
  type OAuthConnectionResponse,
  UiamService,
} from './uiam_service';
import { ES_CLIENT_AUTHENTICATION_HEADER } from '../../common/constants';
import { ConfigSchema } from '../config';

const AGENT_MOCK = { name: "I'm the danger. I'm the one who knocks." };

describe('UiamService', () => {
  let uiamService: UiamService;
  let readFileSyncSpy: jest.SpyInstance;
  let agentSpy: jest.SpyInstance;
  let fetchSpy: jest.SpyInstance;
  beforeEach(() => {
    readFileSyncSpy = jest
      .spyOn(fs, 'readFileSync')
      .mockImplementation((path) => `mocked file content for ${path}`);
    agentSpy = jest.spyOn(undici, 'Agent').mockImplementation(() => AGENT_MOCK as any);
    fetchSpy = jest.spyOn(window, 'fetch');

    uiamService = new UiamService(
      loggingSystemMock.createLogger(),
      ConfigSchema.validate(
        {
          uiam: {
            enabled: true,
            url: 'https://uiam.service',
            sharedSecret: 'secret',
            ssl: { certificateAuthorities: '/some/ca/path' },
          },
        },
        { serverless: true }
      ).uiam,
      {
        kibanaServerURL: 'https://my-project.kb.us-east-1.cloud.es.io:9243',
        elasticsearchUrl: 'https://es.example.com',
      }
    );
  });

  afterEach(() => {
    readFileSyncSpy.mockRestore();
    agentSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  describe('#constructor', () => {
    it('fails if UIAM functionality is not enabled', () => {
      expect(
        () =>
          new UiamService(
            loggingSystemMock.createLogger(),
            {
              enabled: false,
              url: 'https://uiam.service',
              sharedSecret: 'secret',
              ssl: { verificationMode: 'none' },
            },
            { kibanaServerURL: 'https://kibana.test' }
          )
      ).toThrowError('UIAM is not enabled.');
    });

    it('fails if UIAM service URL is not configured', () => {
      expect(
        () =>
          new UiamService(
            loggingSystemMock.createLogger(),
            {
              enabled: true,
              sharedSecret: 'secret',
              ssl: { verificationMode: 'none' },
            },
            { kibanaServerURL: 'https://kibana.test' }
          )
      ).toThrowError('UIAM URL is not configured.');
    });

    it('fails if UIAM service shared secret is not configured', () => {
      expect(
        () =>
          new UiamService(
            loggingSystemMock.createLogger(),
            {
              enabled: true,
              url: 'https://uiam.service',
              ssl: { verificationMode: 'none' },
            },
            { kibanaServerURL: 'https://kibana.test' }
          )
      ).toThrowError('UIAM shared secret is not configured.');
    });

    it('does not create custom dispatcher for `full` verification without custom TLS settings', () => {
      agentSpy.mockClear();
      new UiamService(
        loggingSystemMock.createLogger(),
        {
          enabled: true,
          url: 'https://uiam.service',
          sharedSecret: 'secret',
          ssl: { verificationMode: 'full' },
        },
        { kibanaServerURL: 'https://kibana.test' }
      );
      expect(agentSpy).not.toHaveBeenCalled();
    });

    it('creates a custom dispatcher for `full` verification when custom CAs are needed', () => {
      agentSpy.mockClear();
      new UiamService(
        loggingSystemMock.createLogger(),
        {
          enabled: true,
          url: 'https://uiam.service',
          sharedSecret: 'secret',
          ssl: { verificationMode: 'full', certificateAuthorities: '/some/ca/path' },
        },
        { kibanaServerURL: 'https://kibana.test' }
      );
      expect(agentSpy).toHaveBeenCalledTimes(1);
      expect(agentSpy).toHaveBeenCalledWith({
        connect: {
          ca: ['mocked file content for /some/ca/path'],
          allowPartialTrustChain: true,
          rejectUnauthorized: true,
        },
      });

      agentSpy.mockClear();
      new UiamService(
        loggingSystemMock.createLogger(),
        {
          enabled: true,
          url: 'https://uiam.service',
          sharedSecret: 'secret',
          ssl: {
            verificationMode: 'full',
            certificateAuthorities: ['/some/ca/path-1', '/some/ca/path-2'],
          },
        },
        { kibanaServerURL: 'https://kibana.test' }
      );
      expect(agentSpy).toHaveBeenCalledTimes(1);
      expect(agentSpy).toHaveBeenCalledWith({
        connect: {
          ca: [
            'mocked file content for /some/ca/path-1',
            'mocked file content for /some/ca/path-2',
          ],
          allowPartialTrustChain: true,
          rejectUnauthorized: true,
        },
      });
    });

    it('creates a custom dispatcher for `certificate` verification', () => {
      agentSpy.mockClear();
      new UiamService(
        loggingSystemMock.createLogger(),
        {
          enabled: true,
          url: 'https://uiam.service',
          sharedSecret: 'secret',
          ssl: { verificationMode: 'certificate', certificateAuthorities: '/some/ca/path' },
        },
        { kibanaServerURL: 'https://kibana.test' }
      );
      expect(agentSpy).toHaveBeenCalledTimes(1);
      expect(agentSpy).toHaveBeenCalledWith({
        connect: {
          ca: ['mocked file content for /some/ca/path'],
          allowPartialTrustChain: true,
          rejectUnauthorized: true,
          checkServerIdentity: expect.any(Function),
        },
      });

      agentSpy.mockClear();
      new UiamService(
        loggingSystemMock.createLogger(),
        {
          enabled: true,
          url: 'https://uiam.service',
          sharedSecret: 'secret',
          ssl: { verificationMode: 'certificate' },
        },
        { kibanaServerURL: 'https://kibana.test' }
      );
      expect(agentSpy).toHaveBeenCalledTimes(1);
      expect(agentSpy).toHaveBeenCalledWith({
        connect: {
          allowPartialTrustChain: true,
          rejectUnauthorized: true,
          checkServerIdentity: expect.any(Function),
        },
      });
    });

    it('creates a custom dispatcher for `none` verification', () => {
      agentSpy.mockClear();
      new UiamService(
        loggingSystemMock.createLogger(),
        {
          enabled: true,
          url: 'https://uiam.service',
          sharedSecret: 'secret',
          ssl: { verificationMode: 'none' },
        },
        { kibanaServerURL: 'https://kibana.test' }
      );
      expect(agentSpy).toHaveBeenCalledTimes(1);
      expect(agentSpy).toHaveBeenCalledWith({
        connect: { allowPartialTrustChain: true, rejectUnauthorized: false },
      });
    });

    it('creates a custom dispatcher with client certificate and key for mTLS', () => {
      agentSpy.mockClear();
      new UiamService(
        loggingSystemMock.createLogger(),
        {
          enabled: true,
          url: 'https://uiam.service',
          sharedSecret: 'secret',
          ssl: {
            verificationMode: 'full',
            certificate: '/path/to/cert.pem',
            key: '/path/to/key.pem',
          },
        },
        { kibanaServerURL: 'https://kibana.test' }
      );
      expect(agentSpy).toHaveBeenCalledTimes(1);
      expect(agentSpy).toHaveBeenCalledWith({
        connect: {
          cert: 'mocked file content for /path/to/cert.pem',
          key: 'mocked file content for /path/to/key.pem',
          allowPartialTrustChain: true,
          rejectUnauthorized: true,
        },
      });
    });

    it('creates a custom dispatcher with mTLS client cert and CAs', () => {
      agentSpy.mockClear();
      new UiamService(
        loggingSystemMock.createLogger(),
        {
          enabled: true,
          url: 'https://uiam.service',
          sharedSecret: 'secret',
          ssl: {
            verificationMode: 'full',
            certificate: '/path/to/cert.pem',
            key: '/path/to/key.pem',
            certificateAuthorities: '/some/ca/path',
          },
        },
        { kibanaServerURL: 'https://kibana.test' }
      );
      expect(agentSpy).toHaveBeenCalledTimes(1);
      expect(agentSpy).toHaveBeenCalledWith({
        connect: {
          ca: ['mocked file content for /some/ca/path'],
          cert: 'mocked file content for /path/to/cert.pem',
          key: 'mocked file content for /path/to/key.pem',
          allowPartialTrustChain: true,
          rejectUnauthorized: true,
        },
      });
    });
  });

  describe('#getAuthenticationHeaders', () => {
    it('includes shared secret as a separate header', () => {
      expect(uiamService.getAuthenticationHeaders('some-token')).toEqual({
        authorization: `Bearer some-token`,
        [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
      });
    });
  });

  describe('#getClientAuthentication', () => {
    it('includes shared secret in client authentication', () => {
      expect(uiamService.getClientAuthentication()).toEqual({
        scheme: 'SharedSecret',
        value: 'secret',
      });
    });
  });

  describe('#refreshSessionTokens', () => {
    it('properly calls UIAM service to refresh the tokens', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'new-token', refresh_token: 'new-refresh' }),
      });

      await expect(uiamService.refreshSessionTokens('old-refresh')).resolves.toEqual({
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/tokens/_refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
        },
        body: JSON.stringify({ refresh_token: 'old-refresh' }),
        dispatcher: AGENT_MOCK,
      });
    });

    it('throws error if refresh fails with 400 status code', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: async () => ({ error: { message: 'Bad request' } }),
      });

      await expect(uiamService.refreshSessionTokens('old-refresh')).rejects.toThrowError(
        'Bad request'
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/tokens/_refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
        },
        body: JSON.stringify({ refresh_token: 'old-refresh' }),
        dispatcher: AGENT_MOCK,
      });
    });
  });

  describe('#invalidateSessionTokens', () => {
    it('properly calls UIAM service to invalidate the tokens', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ invalidated_tokens: 2 }),
      });

      await uiamService.invalidateSessionTokens('old-token', 'old-refresh');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/tokens/_invalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
          Authorization: 'Bearer old-token',
        },
        body: JSON.stringify({ tokens: ['old-token', 'old-refresh'] }),
        dispatcher: AGENT_MOCK,
      });
    });

    it('throws error if invalidation fails with 400 status code', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: async () => ({ error: { message: 'Bad request' } }),
      });

      await expect(
        uiamService.invalidateSessionTokens('old-token', 'old-refresh')
      ).rejects.toThrowError('Bad request');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/tokens/_invalidate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
          Authorization: 'Bearer old-token',
        },
        body: JSON.stringify({ tokens: ['old-token', 'old-refresh'] }),
        dispatcher: AGENT_MOCK,
      });
    });
  });

  describe('#exchangeOAuthToken', () => {
    it('properly calls UIAM service to exchange an OAuth token for an ephemeral token', async () => {
      const mockResponse = {
        token: 'essu_ephemeral_token_value',
        credentials: {
          oauth: {
            audience: 'https://my-project.kb.us-east-1.cloud.es.io:9243/',
          },
        },
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(uiamService.exchangeOAuthToken('essu_oauth_access_token')).resolves.toBe(
        'essu_ephemeral_token_value'
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://uiam.service/uiam/api/v1/authentication/_authenticate?include_token=true&audience=https%3A%2F%2Fmy-project.kb.us-east-1.cloud.es.io%3A9243%2F',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
            Authorization: 'Bearer essu_oauth_access_token',
          },
          dispatcher: AGENT_MOCK,
        }
      );
    });

    it('throws when audience in response does not match expected audience', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          token: 'essu_ephemeral_token_value',
          credentials: {
            oauth: { audience: 'https://wrong-kibana.example.com' },
          },
        }),
      });

      await expect(uiamService.exchangeOAuthToken('essu_oauth_access_token')).rejects.toThrow(
        'OAuth token audience mismatch'
      );
    });

    it('throws and logs error when UIAM service returns an error', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Invalid token' } }),
        headers: new Headers(),
      });

      await expect(uiamService.exchangeOAuthToken('essu_invalid_token')).rejects.toThrow();
    });
  });

  describe('#grantApiKey', () => {
    it('properly calls UIAM service to grant an API key with Bearer scheme and name', async () => {
      const mockResponse: GrantUiamApiKeyResponse = {
        id: 'api-key-id',
        key: 'encoded-key-value',
        description: 'my-api-key',
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(
        uiamService.grantApiKey(new HTTPAuthorizationHeader('Bearer', 'access-token'), {
          name: 'my-api-key',
        })
      ).resolves.toEqual(mockResponse);

      const expectedRequestBody: GrantUiamApiKeyRequestBody = {
        description: 'my-api-key',
        internal: true,
        role_assignments: {
          limit: {
            access: ['application'],
            resource: ['project'],
          },
        },
      };

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/api-keys/_grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
          Authorization: 'Bearer access-token',
        },
        body: JSON.stringify(expectedRequestBody),
        dispatcher: AGENT_MOCK,
      });
    });

    it('properly calls UIAM service to grant an API key with ApiKey scheme and name', async () => {
      const mockResponse: GrantUiamApiKeyResponse = {
        id: 'api-key-id',
        key: 'essu_api_key_from_grant',
        description: 'api-key-from-grant',
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(
        uiamService.grantApiKey(new HTTPAuthorizationHeader('ApiKey', 'essu_api_key'), {
          name: 'api-key-from-grant',
        })
      ).resolves.toEqual(mockResponse);

      const expectedRequestBody: GrantUiamApiKeyRequestBody = {
        description: 'api-key-from-grant',
        internal: true,
        role_assignments: {
          limit: {
            access: ['application'],
            resource: ['project'],
          },
        },
      };

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/api-keys/_grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
          Authorization: 'ApiKey essu_api_key',
        },
        body: JSON.stringify(expectedRequestBody),
        dispatcher: AGENT_MOCK,
      });
    });

    it('properly calls UIAM service to grant an API key with expiration', async () => {
      const mockResponse: GrantUiamApiKeyResponse = {
        id: 'api-key-id-with-exp',
        key: 'encoded-key-with-expiration',
        description: 'test-key-with-exp',
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(
        uiamService.grantApiKey(new HTTPAuthorizationHeader('Bearer', 'access-token'), {
          name: 'test-key-with-exp',
          expiration: '7d',
        })
      ).resolves.toEqual(mockResponse);

      const expectedRequestBody: GrantUiamApiKeyRequestBody = {
        description: 'test-key-with-exp',
        internal: true,
        expiration: '7d',
        role_assignments: {
          limit: {
            access: ['application'],
            resource: ['project'],
          },
        },
      };

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/api-keys/_grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
          Authorization: 'Bearer access-token',
        },
        body: JSON.stringify(expectedRequestBody),
        dispatcher: AGENT_MOCK,
      });
    });

    it('throws error if granting API key fails with 400 status code', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: async () => ({ error: { message: 'Invalid request' } }),
      });

      await expect(
        uiamService.grantApiKey(new HTTPAuthorizationHeader('Bearer', 'access-token'), {
          name: 'test-key',
        })
      ).rejects.toThrowError('Invalid request');

      const expectedRequestBody: GrantUiamApiKeyRequestBody = {
        description: 'test-key',
        internal: true,
        role_assignments: {
          limit: {
            access: ['application'],
            resource: ['project'],
          },
        },
      };

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/api-keys/_grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
          Authorization: 'Bearer access-token',
        },
        body: JSON.stringify(expectedRequestBody),
        dispatcher: AGENT_MOCK,
      });
    });

    it('throws error with "Unknown error" message if error response has no message', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({ error: {} }),
      });

      await expect(
        uiamService.grantApiKey(new HTTPAuthorizationHeader('Bearer', 'access-token'), {
          name: 'test-key',
        })
      ).rejects.toThrowError('Unknown error');
    });

    it('throws error if granting API key fails with 401 unauthorized status code', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: async () => ({ error: { message: 'Unauthorized' } }),
      });

      await expect(
        uiamService.grantApiKey(new HTTPAuthorizationHeader('Bearer', 'invalid-token'), {
          name: 'test-key',
        })
      ).rejects.toThrowError('Unauthorized');
    });

    it('throws error if granting API key fails with 403 forbidden status code', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers(),
        json: async () => ({ error: { message: 'Forbidden' } }),
      });

      await expect(
        uiamService.grantApiKey(new HTTPAuthorizationHeader('Bearer', 'access-token'), {
          name: 'test-key',
        })
      ).rejects.toThrowError('Forbidden');
    });

    it('throws error if granting API key fails with 500 server error status code', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({ error: { message: 'Internal Server Error' } }),
      });

      await expect(
        uiamService.grantApiKey(new HTTPAuthorizationHeader('Bearer', 'access-token'), {
          name: 'test-key',
        })
      ).rejects.toThrowError('Internal Server Error');
    });
  });

  describe('#revokeApiKey', () => {
    it('properly calls UIAM service to revoke an API key', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        status: 204,
      });

      await uiamService.revokeApiKey('test-key-id', 'access-token');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://uiam.service/uiam/api/v1/api-keys/test-key-id',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
            Authorization: 'ApiKey access-token',
          },
          dispatcher: AGENT_MOCK,
        }
      );
    });

    it('throws error if revocation fails with 400 status code', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: async () => ({ error: { message: 'Bad request' } }),
      });

      await expect(uiamService.revokeApiKey('test-key-id', 'access-token')).rejects.toThrowError(
        'Bad request'
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://uiam.service/uiam/api/v1/api-keys/test-key-id',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
            Authorization: 'ApiKey access-token',
          },
          dispatcher: AGENT_MOCK,
        }
      );
    });
  });

  describe('#convertApiKeys', () => {
    it('properly calls UIAM service to convert API keys with injected endpoint', async () => {
      const mockResponse = {
        results: [
          {
            status: 'success',
            id: 'converted-key-id',
            key: 'essu_converted_key',
            description: 'converted key',
            organization_id: 'org-123',
            internal: true,
            role_assignments: {},
            creation_date: '2026-01-01T00:00:00Z',
            expiration_date: null,
          },
        ],
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(uiamService.convertApiKeys(['es-api-key-base64'])).resolves.toEqual(
        mockResponse
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/api-keys/_convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
        },
        body: JSON.stringify({
          keys: [
            { type: 'elasticsearch', key: 'es-api-key-base64', endpoint: 'https://es.example.com' },
          ],
        }),
        dispatcher: AGENT_MOCK,
      });
    });

    it('properly calls UIAM service to convert multiple API keys with injected endpoint', async () => {
      const mockResponse = {
        results: [
          {
            status: 'success',
            id: 'key-1',
            key: 'essu_key_1',
            description: 'key 1',
            organization_id: 'org-1',
            internal: true,
            role_assignments: {},
            creation_date: '2026-01-01T00:00:00Z',
            expiration_date: null,
          },
          {
            status: 'failed',
            code: 'ES_API_KEY_AUTHENTICATION_FAILED',
            message: 'Auth failed',
            resource: null,
            type: 'UNKNOWN',
          },
        ],
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(uiamService.convertApiKeys(['valid-key', 'invalid-key'])).resolves.toEqual(
        mockResponse
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/api-keys/_convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
        },
        body: JSON.stringify({
          keys: [
            { type: 'elasticsearch', key: 'valid-key', endpoint: 'https://es.example.com' },
            { type: 'elasticsearch', key: 'invalid-key', endpoint: 'https://es.example.com' },
          ],
        }),
        dispatcher: AGENT_MOCK,
      });
    });

    it('throws when elasticsearchUrl is not configured', async () => {
      const serviceWithoutUrl = new UiamService(
        loggingSystemMock.createLogger(),
        ConfigSchema.validate(
          {
            uiam: {
              enabled: true,
              url: 'https://uiam.service',
              sharedSecret: 'secret',
              ssl: { certificateAuthorities: '/some/ca/path' },
            },
          },
          { serverless: true }
        ).uiam,
        { kibanaServerURL: 'https://kibana.test' }
      );

      await expect(serviceWithoutUrl.convertApiKeys(['es-api-key'])).rejects.toThrowError(
        'Cannot convert API keys: Elasticsearch URL could not be resolved from cloud.id'
      );

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('throws error if conversion fails with 400 status code', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: async () => ({ error: { message: 'Must authenticate using mTLS' } }),
      });

      await expect(uiamService.convertApiKeys(['es-api-key'])).rejects.toThrowError(
        'Must authenticate using mTLS'
      );

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/api-keys/_convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
        },
        body: JSON.stringify({
          keys: [{ type: 'elasticsearch', key: 'es-api-key', endpoint: 'https://es.example.com' }],
        }),
        dispatcher: AGENT_MOCK,
      });
    });
  });

  describe('#createOAuthClient', () => {
    it('properly calls UIAM service to create an OAuth client', async () => {
      const mockResponse: OAuthClientResponse = {
        id: 'client-id',
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        client_name: 'Test Client',
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(
        uiamService.createOAuthClient('access-token', {
          resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
          client_name: 'Test Client',
        })
      ).resolves.toEqual(mockResponse);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/oauth/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
          Authorization: 'Bearer access-token',
        },
        body: JSON.stringify({
          resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
          client_name: 'Test Client',
        }),
        dispatcher: AGENT_MOCK,
      });
    });

    it('throws error if creation fails', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: async () => ({ error: { message: 'Bad request' } }),
      });

      await expect(
        uiamService.createOAuthClient('access-token', {
          resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        })
      ).rejects.toThrowError('Bad request');
    });

    it('forwards redirect_uris, client_logo, and client_metadata verbatim to UIAM', async () => {
      const mockResponse: OAuthClientResponse = {
        id: 'client-id',
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        redirect_uris: ['https://example.com/cb'],
        client_logo: { media_type: 'image/png', data: 'abc' },
      };

      fetchSpy.mockResolvedValue({ ok: true, json: async () => mockResponse });

      const body = {
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        client_type: 'confidential' as const,
        client_metadata: { owner: 'admin' },
        client_logo: { media_type: 'image/png', data: 'abc' },
        redirect_uris: ['https://example.com/cb'],
      };

      await expect(uiamService.createOAuthClient('access-token', body)).resolves.toEqual(
        mockResponse
      );

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://uiam.service/uiam/api/v1/oauth/clients',
        expect.objectContaining({ method: 'POST', body: JSON.stringify(body) })
      );
    });

    it('surfaces UIAM ErrorDetails (code, type, resource) in the thrown Boom message', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: async () => ({
          error: {
            code: 'INVALID_REDIRECT_URI',
            type: 'validation_error',
            resource: 'redirect_uris[0]',
            message: 'Redirect URI must not contain a fragment',
          },
        }),
      });

      await expect(
        uiamService.createOAuthClient('access-token', {
          resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        })
      ).rejects.toThrowError(
        '[INVALID_REDIRECT_URI/validation_error] Redirect URI must not contain a fragment (resource: redirect_uris[0])'
      );
    });
  });

  describe('#listOAuthClients', () => {
    it('properly calls UIAM service to list OAuth clients', async () => {
      const mockResponse = { clients: [] };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(uiamService.listOAuthClients('access-token')).resolves.toEqual(mockResponse);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/oauth/clients', {
        method: 'GET',
        headers: {
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
          Authorization: 'Bearer access-token',
        },
        dispatcher: AGENT_MOCK,
      });
    });

    it('includes client_id query parameter when provided', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ clients: [] }),
      });

      await uiamService.listOAuthClients('access-token', 'specific-client-id');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://uiam.service/uiam/api/v1/oauth/clients?client_id=specific-client-id',
        {
          method: 'GET',
          headers: {
            [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
            Authorization: 'Bearer access-token',
          },
          dispatcher: AGENT_MOCK,
        }
      );
    });

    it('throws error if listing fails', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers(),
        json: async () => ({ error: { message: 'Forbidden' } }),
      });

      await expect(uiamService.listOAuthClients('access-token')).rejects.toThrowError('Forbidden');
    });
  });

  describe('#updateOAuthClient', () => {
    it('properly calls UIAM service to update an OAuth client', async () => {
      const mockResponse: OAuthClientResponse = {
        id: 'client-id',
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        client_name: 'Updated Name',
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(
        uiamService.updateOAuthClient('access-token', 'client-id', {
          client_name: 'Updated Name',
          client_metadata: { key: 'value' },
        })
      ).resolves.toEqual(mockResponse);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://uiam.service/uiam/api/v1/oauth/clients/client-id',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
            Authorization: 'Bearer access-token',
          },
          body: JSON.stringify({ client_name: 'Updated Name', client_metadata: { key: 'value' } }),
          dispatcher: AGENT_MOCK,
        }
      );
    });

    it('throws error if update fails', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
        json: async () => ({ error: { message: 'Client not found' } }),
      });

      await expect(
        uiamService.updateOAuthClient('access-token', 'missing-id', {
          client_metadata: {},
        })
      ).rejects.toThrowError('Client not found');
    });

    it('encodes reserved characters in the client id path segment', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'weird/id?x#y',
          resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        }),
      });

      await uiamService.updateOAuthClient('access-token', 'weird/id?x#y', {
        client_name: 'Updated',
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://uiam.service/uiam/api/v1/oauth/clients/weird%2Fid%3Fx%23y',
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  describe('#revokeOAuthClient', () => {
    it('properly calls UIAM service to revoke an OAuth client', async () => {
      const mockResponse: OAuthClientResponse = {
        id: 'client-id',
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        revoked: true,
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(
        uiamService.revokeOAuthClient('access-token', 'client-id', 'no longer needed')
      ).resolves.toEqual(mockResponse);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://uiam.service/uiam/api/v1/oauth/clients/client-id/_revoke',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
            Authorization: 'Bearer access-token',
          },
          body: JSON.stringify({ reason: 'no longer needed' }),
          dispatcher: AGENT_MOCK,
        }
      );
    });

    it('throws error if revocation fails', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: async () => ({ error: { message: 'Already revoked' } }),
      });

      await expect(uiamService.revokeOAuthClient('access-token', 'client-id')).rejects.toThrowError(
        'Already revoked'
      );
    });

    it('encodes reserved characters in the client id path segment', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'weird/id?x#y',
          resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
          revoked: true,
        }),
      });

      await uiamService.revokeOAuthClient('access-token', 'weird/id?x#y');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://uiam.service/uiam/api/v1/oauth/clients/weird%2Fid%3Fx%23y/_revoke',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('#listOAuthConnections', () => {
    it('properly calls UIAM service to list OAuth connections', async () => {
      const mockResponse = { connections: [] };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(uiamService.listOAuthConnections('access-token')).resolves.toEqual(mockResponse);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/oauth/connections', {
        method: 'GET',
        headers: {
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
          Authorization: 'Bearer access-token',
        },
        dispatcher: AGENT_MOCK,
      });
    });

    it('includes query parameters when provided', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ connections: [] }),
      });

      await uiamService.listOAuthConnections('access-token', 'cid', 'conn-id');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://uiam.service/uiam/api/v1/oauth/connections?client_id=cid&connection_id=conn-id',
        {
          method: 'GET',
          headers: {
            [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
            Authorization: 'Bearer access-token',
          },
          dispatcher: AGENT_MOCK,
        }
      );
    });

    it('throws error if listing fails', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({ error: { message: 'Internal Server Error' } }),
      });

      await expect(uiamService.listOAuthConnections('access-token')).rejects.toThrowError(
        'Internal Server Error'
      );
    });
  });

  describe('#updateOAuthConnection', () => {
    it('properly calls UIAM service to update an OAuth connection', async () => {
      const mockResponse: OAuthConnectionResponse = {
        id: 'conn-id',
        client_id: 'client-id',
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        name: 'New name',
      };

      fetchSpy.mockResolvedValue({ ok: true, json: async () => mockResponse });

      await expect(
        uiamService.updateOAuthConnection('access-token', 'client-id', 'conn-id', {
          name: 'New name',
        })
      ).resolves.toEqual(mockResponse);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://uiam.service/uiam/api/v1/oauth/clients/client-id/connections/conn-id',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
            Authorization: 'Bearer access-token',
          },
          body: JSON.stringify({ name: 'New name' }),
          dispatcher: AGENT_MOCK,
        }
      );
    });

    it('throws error if update fails', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 404,
        headers: new Headers(),
        json: async () => ({ error: { message: 'Connection not found' } }),
      });

      await expect(
        uiamService.updateOAuthConnection('access-token', 'client-id', 'missing', {
          name: 'x',
        })
      ).rejects.toThrowError('Connection not found');
    });

    it('encodes reserved characters in both path segments', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'conn/id?x',
          client_id: 'client/id#y',
          resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
          name: 'n',
        }),
      });

      await uiamService.updateOAuthConnection('access-token', 'client/id#y', 'conn/id?x', {
        name: 'n',
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://uiam.service/uiam/api/v1/oauth/clients/client%2Fid%23y/connections/conn%2Fid%3Fx',
        expect.objectContaining({ method: 'PATCH' })
      );
    });
  });

  describe('#revokeOAuthConnection', () => {
    it('properly calls UIAM service to revoke an OAuth connection', async () => {
      const mockResponse: OAuthConnectionResponse = {
        id: 'conn-id',
        client_id: 'client-id',
        resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
        revoked: true,
      };

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      await expect(
        uiamService.revokeOAuthConnection('access-token', 'client-id', 'conn-id', 'revoked')
      ).resolves.toEqual(mockResponse);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://uiam.service/uiam/api/v1/oauth/clients/client-id/connections/conn-id/_revoke',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
            Authorization: 'Bearer access-token',
          },
          body: JSON.stringify({ reason: 'revoked' }),
          dispatcher: AGENT_MOCK,
        }
      );
    });

    it('throws error if revocation fails', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: async () => ({ error: { message: 'Connection not found' } }),
      });

      await expect(
        uiamService.revokeOAuthConnection('access-token', 'client-id', 'conn-id')
      ).rejects.toThrowError('Connection not found');
    });

    it('encodes reserved characters in both path segments', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'conn/id?x',
          client_id: 'client/id#y',
          resource: 'https://test-project.kb.us-central1.gcp.elastic.cloud',
          revoked: true,
        }),
      });

      await uiamService.revokeOAuthConnection('access-token', 'client/id#y', 'conn/id?x');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://uiam.service/uiam/api/v1/oauth/clients/client%2Fid%23y/connections/conn%2Fid%3Fx/_revoke',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
