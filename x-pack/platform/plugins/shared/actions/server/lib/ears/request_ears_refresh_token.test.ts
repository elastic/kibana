/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('axios', () => ({ create: jest.fn().mockReturnValue({}) }));
jest.mock('../axios_utils', () => ({ request: jest.fn() }));
jest.mock('./url', () => ({
  getEarsEndpointsForProvider: jest.fn().mockReturnValue({ refreshEndpoint: '/v1/refresh' }),
  resolveEarsUrl: jest.fn().mockReturnValue('https://ears.example.com/v1/refresh'),
}));

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/core/server';
import { request as mockRequest } from '../axios_utils';
import { actionsConfigMock } from '../../actions_config.mock';
import { requestEarsRefreshToken } from './request_ears_refresh_token';

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const configurationUtilities = actionsConfigMock.create();

const NOW = new Date('2025-01-15T12:00:00.000Z');

const BASE_RESPONSE = {
  token_type: 'Bearer',
  access_token: 'new-access-token',
  refresh_token: 'new-refresh-token',
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('requestEarsRefreshToken', () => {
  describe('expiresIn derivation from expiry field', () => {
    it('derives expiresIn from a valid future expiry timestamp', async () => {
      const expiry = new Date(NOW.getTime() + 3600 * 1000).toISOString();
      (mockRequest as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: { ...BASE_RESPONSE, expiry },
      });

      const result = await requestEarsRefreshToken(
        'google',
        logger,
        { refreshToken: 'stored-refresh-token' },
        configurationUtilities
      );

      expect(result.expiresIn).toBe(3600);
    });

    it('returns undefined expiresIn for the Go zero-time sentinel', async () => {
      (mockRequest as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: { ...BASE_RESPONSE, expiry: '0001-01-01T00:00:00Z' },
      });

      const result = await requestEarsRefreshToken(
        'slack',
        logger,
        { refreshToken: 'stored-refresh-token' },
        configurationUtilities
      );

      expect(result.expiresIn).toBeUndefined();
    });

    it('returns undefined expiresIn when expiry is a past timestamp', async () => {
      const expiry = new Date(NOW.getTime() - 60 * 1000).toISOString();
      (mockRequest as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: { ...BASE_RESPONSE, expiry },
      });

      const result = await requestEarsRefreshToken(
        'google',
        logger,
        { refreshToken: 'stored-refresh-token' },
        configurationUtilities
      );

      expect(result.expiresIn).toBeUndefined();
    });

    it('returns undefined expiresIn when expiry is absent', async () => {
      (mockRequest as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: BASE_RESPONSE,
      });

      const result = await requestEarsRefreshToken(
        'google',
        logger,
        { refreshToken: 'stored-refresh-token' },
        configurationUtilities
      );

      expect(result.expiresIn).toBeUndefined();
    });
  });

  it('returns all token fields on a successful response', async () => {
    const expiry = new Date(NOW.getTime() + 7200 * 1000).toISOString();
    (mockRequest as jest.Mock).mockResolvedValueOnce({
      status: 200,
      data: {
        ...BASE_RESPONSE,
        expiry,
        refresh_token_expires_in: 604800,
      },
    });

    const result = await requestEarsRefreshToken(
      'google',
      logger,
      { refreshToken: 'stored-refresh-token' },
      configurationUtilities
    );

    expect(result).toEqual({
      tokenType: 'Bearer',
      accessToken: 'new-access-token',
      expiresIn: 7200,
      refreshToken: 'new-refresh-token',
      refreshTokenExpiresIn: 604800,
    });
  });

  it('throws on a non-200 response', async () => {
    (mockRequest as jest.Mock).mockResolvedValueOnce({
      status: 401,
      data: { error: 'unauthorized' },
    });

    await expect(
      requestEarsRefreshToken(
        'google',
        logger,
        { refreshToken: 'bad-token' },
        configurationUtilities
      )
    ).rejects.toThrow('Failed to refresh token from auth redirect service');
  });
});
