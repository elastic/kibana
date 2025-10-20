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

  describe('#authenticate', () => {
    it('properly calls UIAM service to authenticate the user', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          type: 'user',
          user_id: 'user123',
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe',
          organization_id: 'org123',
          credentials: {
            id: 'cred123',
            type: 'token',
            creation: '2025-01-01T00:00:00Z',
            expiration: null,
            internal: false,
          },
        }),
      });

      const result = await uiamService.authenticate('some-token');

      expect(result).toEqual({
        username: 'user123',
        email: 'user@example.com',
        full_name: 'John Doe',
        roles: [],
        enabled: true,
        authentication_realm: { name: 'uiam', type: 'uiam' },
        lookup_realm: { name: 'uiam', type: 'uiam' },
        authentication_type: 'token',
        metadata: {
          _reserved: false,
        },
      });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://uiam.service/uiam/api/v1/authentication/_authenticate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            [ES_CLIENT_AUTHENTICATION_HEADER]: 'secret',
            Authorization: 'Bearer some-token',
          },
          dispatcher: AGENT_MOCK,
        }
      );
    });

    it('handles user with no first or last name', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          type: 'user',
          user_id: 'user123',
          email: 'user@example.com',
          first_name: null,
          last_name: null,
          organization_id: 'org123',
          credentials: {
            id: 'cred123',
            type: 'token',
            creation: '2025-01-01T00:00:00Z',
            expiration: null,
            internal: false,
          },
        }),
      });

      const result = await uiamService.authenticate('some-token');

      expect(result.full_name).toBeUndefined();
    });

    it('maps token credential type correctly', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({
          type: 'user',
          user_id: 'user123',
          email: 'user@example.com',
          first_name: 'John',
          last_name: 'Doe',
          organization_id: 'org123',
          credentials: {
            id: 'cred123',
            type: 'token',
            creation: '2025-01-01T00:00:00Z',
            expiration: '2025-01-01T01:00:00Z',
            internal: true,
          },
        }),
      });

      const result = await uiamService.authenticate('some-token');

      expect(result.authentication_type).toBe('token');
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

    it('fail if invalidation fails', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers(),
        json: async () => ({ error: { message: 'Oh no!' } }),
      });

      await expect(
        uiamService.invalidateSessionTokens('old-token', 'old-refresh')
      ).rejects.toThrowError('Oh no!');
    });

    it('throws error if invalidation fails with 500 status code', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({ error: { message: 'Oh no!' } }),
      });

      await expect(
        uiamService.invalidateSessionTokens('old-token', 'old-refresh')
      ).rejects.toThrowError('Oh no!');

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
});
