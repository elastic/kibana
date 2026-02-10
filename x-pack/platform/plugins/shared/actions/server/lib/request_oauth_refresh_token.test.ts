/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('axios', () => ({
  create: jest.fn(),
}));

import axios from 'axios';
import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { requestOAuthRefreshToken } from './request_oauth_refresh_token';

const createAxiosInstanceMock = axios.create as jest.Mock;
const axiosInstanceMock = jest.fn();

const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('requestOAuthRefreshToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createAxiosInstanceMock.mockReturnValue(axiosInstanceMock);
  });

  test('refreshes and returns top-level access_token by default', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockResolvedValueOnce({
      status: 200,
      data: {
        token_type: 'bearer',
        access_token: 'new-access',
        expires_in: 3600,
      },
    });

    const result = await requestOAuthRefreshToken(
      'https://provider.example/token',
      mockLogger,
      { refreshToken: 'refresh', clientId: 'client', clientSecret: 'secret' },
      configurationUtilities,
      true
    );

    expect(result.accessToken).toBe('new-access');

    const [, cfg] = axiosInstanceMock.mock.calls[0];
    expect(cfg.data).toContain('grant_type=refresh_token');
    expect(cfg.headers.Authorization).toMatch(/^Basic\s+/);
  });

  test('supports tokenExtractor for non-standard responses', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockResolvedValueOnce({
      status: 200,
      data: {
        token_type: 'bearer',
        authed_user: { access_token: 'nested-access' },
      },
    });

    const result = await requestOAuthRefreshToken(
      'https://provider.example/token',
      mockLogger,
      { refreshToken: 'refresh', clientId: 'client', clientSecret: 'secret' },
      configurationUtilities,
      true,
      'slackUserToken'
    );

    expect(result.accessToken).toBe('nested-access');
  });

  test('throws on non-200', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockResolvedValueOnce({
      status: 400,
      data: { error: 'invalid_grant' },
    });

    await expect(
      requestOAuthRefreshToken(
        'https://provider.example/token',
        mockLogger,
        { refreshToken: 'refresh', clientId: 'client', clientSecret: 'secret' },
        configurationUtilities,
        true
      )
    ).rejects.toBeDefined();
  });
});

