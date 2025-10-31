/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import undici from 'undici';

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { UiamService } from './uiam_service';
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
        connect: { ca: ['mocked file content for /some/ca/path'], rejectUnauthorized: true },
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
        connect: { rejectUnauthorized: true, checkServerIdentity: expect.any(Function) },
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
      expect(agentSpy).toHaveBeenCalledWith({ connect: { rejectUnauthorized: false } });
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

  describe('#getUserProfileGrant', () => {
    it('includes shared secret in a profile grant', () => {
      expect(uiamService.getUserProfileGrant('some-token')).toEqual({
        type: 'uiamAccessToken',
        accessToken: 'some-token',
        sharedSecret: 'secret',
      });
    });
  });

  describe('#getEsClientAuthenticationHeader', () => {
    it('returns the ES client authentication header with shared secret', () => {
      expect(uiamService.getEsClientAuthenticationHeader()).toEqual({
        [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
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
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'api-key-id',
          key: 'encoded-key-value',
          description: 'my-api-key',
        }),
      });

      await expect(
        uiamService.grantApiKey('Bearer', 'access-token', 'my-api-key')
      ).resolves.toEqual({
        id: 'api-key-id',
        key: 'encoded-key-value',
        description: 'my-api-key',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/api-keys/_grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
          Authorization: 'Bearer access-token',
        },
        body: JSON.stringify({
          description: 'my-api-key',
          internal: true,
          role_assignments: {
            limit: {
              access: ['application'],
              resource: ['project'],
            },
          },
        }),
        dispatcher: AGENT_MOCK,
      });
    });

    it('properly calls UIAM service to grant an API key with ApiKey scheme and name', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'api-key-id',
          key: 'essu_api_key_from_grant',
          description: 'api-key-from-grant',
        }),
      });

      await expect(
        uiamService.grantApiKey('ApiKey', 'essu_api_key', 'api-key-from-grant')
      ).resolves.toEqual({
        id: 'api-key-id',
        key: 'essu_api_key_from_grant',
        description: 'api-key-from-grant',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/api-keys/_grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
          Authorization: 'ApiKey essu_api_key',
        },
        body: JSON.stringify({
          description: 'api-key-from-grant',
          internal: true,
          role_assignments: {
            limit: {
              access: ['application'],
              resource: ['project'],
            },
          },
        }),
        dispatcher: AGENT_MOCK,
      });
    });

    it('properly calls UIAM service to grant an API key without expiration', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'api-key-id-no-exp',
          key: 'encoded-key-no-expiration',
          description: 'test-key-no-exp',
        }),
      });

      await expect(
        uiamService.grantApiKey('Bearer', 'access-token', 'test-key-no-exp')
      ).resolves.toEqual({
        id: 'api-key-id-no-exp',
        key: 'encoded-key-no-expiration',
        description: 'test-key-no-exp',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/api-keys/_grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
          Authorization: 'Bearer access-token',
        },
        body: JSON.stringify({
          description: 'test-key-no-exp',
          internal: true,
          role_assignments: {
            limit: {
              access: ['application'],
              resource: ['project'],
            },
          },
        }),
        dispatcher: AGENT_MOCK,
      });
    });

    it('properly calls UIAM service to grant an API key with expiration', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'api-key-id-with-exp',
          key: 'encoded-key-with-expiration',
          description: 'test-key-with-exp',
        }),
      });

      await expect(
        uiamService.grantApiKey('Bearer', 'access-token', 'test-key-with-exp', '7d')
      ).resolves.toEqual({
        id: 'api-key-id-with-exp',
        key: 'encoded-key-with-expiration',
        description: 'test-key-with-exp',
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/api-keys/_grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
          Authorization: 'Bearer access-token',
        },
        body: JSON.stringify({
          description: 'test-key-with-exp',
          internal: true,
          expiration: '7d',
          role_assignments: {
            limit: {
              access: ['application'],
              resource: ['project'],
            },
          },
        }),
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
        uiamService.grantApiKey('Bearer', 'access-token', 'test-key')
      ).rejects.toThrowError('Invalid request');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith('https://uiam.service/uiam/api/v1/api-keys/_grant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
          Authorization: 'Bearer access-token',
        },
        body: JSON.stringify({
          description: 'test-key',
          internal: true,
          role_assignments: {
            limit: {
              access: ['application'],
              resource: ['project'],
            },
          },
        }),
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
        uiamService.grantApiKey('Bearer', 'access-token', 'test-key')
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
        uiamService.grantApiKey('Bearer', 'invalid-token', 'test-key')
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
        uiamService.grantApiKey('Bearer', 'access-token', 'test-key')
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
        uiamService.grantApiKey('Bearer', 'access-token', 'test-key')
      ).rejects.toThrowError('Internal Server Error');
    });
  });
});
