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
      ).uiam
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
          new UiamService(loggingSystemMock.createLogger(), {
            enabled: false,
            url: 'https://uiam.service',
            sharedSecret: 'secret',
            ssl: { verificationMode: 'none' },
          })
      ).toThrowError('UIAM is not enabled.');
    });

    it('fails if UIAM service URL is not configured', () => {
      expect(
        () =>
          new UiamService(loggingSystemMock.createLogger(), {
            enabled: true,
            sharedSecret: 'secret',
            ssl: { verificationMode: 'none' },
          })
      ).toThrowError('UIAM URL is not configured.');
    });

    it('fails if UIAM service shared secret is not configured', () => {
      expect(
        () =>
          new UiamService(loggingSystemMock.createLogger(), {
            enabled: true,
            url: 'https://uiam.service',
            ssl: { verificationMode: 'none' },
          })
      ).toThrowError('UIAM shared secret is not configured.');
    });

    it('does not create custom dispatcher for `full` verification without custom CAs', () => {
      agentSpy.mockClear();
      new UiamService(loggingSystemMock.createLogger(), {
        enabled: true,
        url: 'https://uiam.service',
        sharedSecret: 'secret',
        ssl: { verificationMode: 'full' },
      });
      expect(agentSpy).not.toHaveBeenCalled();
    });

    it('creates a custom dispatcher for `full` verification when custom CAs are needed', () => {
      agentSpy.mockClear();
      new UiamService(loggingSystemMock.createLogger(), {
        enabled: true,
        url: 'https://uiam.service',
        sharedSecret: 'secret',
        ssl: { verificationMode: 'full', certificateAuthorities: '/some/ca/path' },
      });
      expect(agentSpy).toHaveBeenCalledTimes(1);
      expect(agentSpy).toHaveBeenCalledWith({
        connect: {
          ca: ['mocked file content for /some/ca/path'],
          allowPartialTrustChain: true,
          rejectUnauthorized: true,
        },
      });

      agentSpy.mockClear();
      new UiamService(loggingSystemMock.createLogger(), {
        enabled: true,
        url: 'https://uiam.service',
        sharedSecret: 'secret',
        ssl: {
          verificationMode: 'full',
          certificateAuthorities: ['/some/ca/path-1', '/some/ca/path-2'],
        },
      });
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
      new UiamService(loggingSystemMock.createLogger(), {
        enabled: true,
        url: 'https://uiam.service',
        sharedSecret: 'secret',
        ssl: { verificationMode: 'certificate', certificateAuthorities: '/some/ca/path' },
      });
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
      new UiamService(loggingSystemMock.createLogger(), {
        enabled: true,
        url: 'https://uiam.service',
        sharedSecret: 'secret',
        ssl: { verificationMode: 'certificate' },
      });
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
      new UiamService(loggingSystemMock.createLogger(), {
        enabled: true,
        url: 'https://uiam.service',
        sharedSecret: 'secret',
        ssl: { verificationMode: 'none' },
      });
      expect(agentSpy).toHaveBeenCalledTimes(1);
      expect(agentSpy).toHaveBeenCalledWith({
        connect: { allowPartialTrustChain: true, rejectUnauthorized: false },
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
});
