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
import { requestOAuthAuthorizationCodeToken } from './request_oauth_authorization_code_token';

const createAxiosInstanceMock = axios.create as jest.Mock;
const axiosInstanceMock = jest.fn();

const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('requestOAuthAuthorizationCodeToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createAxiosInstanceMock.mockReturnValue(axiosInstanceMock);
  });

  test('extracts top-level access_token by default', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockResolvedValueOnce({
      status: 200,
      data: {
        token_type: 'bearer',
        access_token: 'xoxb-bot-token',
        refresh_token: 'refresh-1',
        expires_in: 3600,
      },
    });

    const result = await requestOAuthAuthorizationCodeToken(
      'https://slack.com/api/oauth.v2.access',
      mockLogger,
      {
        code: 'code',
        redirectUri: 'https://kibana.example.com/callback',
        codeVerifier: 'verifier',
        clientId: 'client',
        clientSecret: 'secret',
      },
      configurationUtilities,
      false
    );

    expect(result.accessToken).toBe('xoxb-bot-token');
    expect(result.refreshToken).toBe('refresh-1');
    expect(result.expiresIn).toBe(3600);

    // ensure we sent client_secret in body (not basic auth)
    const [, cfg] = axiosInstanceMock.mock.calls[0];
    expect(cfg.headers['Content-Type']).toContain('application/x-www-form-urlencoded');
    expect(cfg.data).toContain('client_secret=secret');
    expect(cfg.headers.Authorization).toBeUndefined();
  });

  test('supports Slack user token extraction (authed_user.access_token)', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockResolvedValueOnce({
      status: 200,
      data: {
        ok: true,
        access_token: 'xoxb-bot-token',
        token_type: 'bearer',
        authed_user: { access_token: 'xoxp-user-token' },
      },
    });

    const result = await requestOAuthAuthorizationCodeToken(
      'https://slack.com/api/oauth.v2.access',
      mockLogger,
      {
        code: 'code',
        redirectUri: 'https://kibana.example.com/callback',
        codeVerifier: 'verifier',
        clientId: 'client',
        clientSecret: 'secret',
      },
      configurationUtilities,
      true,
      'slackUserToken'
    );

    expect(result.accessToken).toBe('xoxp-user-token');

    // ensure we used basic auth (no client_secret in body, has Authorization header)
    const [, cfg] = axiosInstanceMock.mock.calls[0];
    expect(cfg.data).not.toContain('client_secret=');
    expect(cfg.headers.Authorization).toMatch(/^Basic\s+/);
  });

  test('throws when token cannot be extracted', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockResolvedValueOnce({
      status: 200,
      data: {
        token_type: 'bearer',
        // no access_token anywhere
        authed_user: {},
      },
    });

    await expect(
      requestOAuthAuthorizationCodeToken(
        'https://slack.com/api/oauth.v2.access',
        mockLogger,
        {
          code: 'code',
          redirectUri: 'https://kibana.example.com/callback',
          codeVerifier: 'verifier',
          clientId: 'client',
          clientSecret: 'secret',
        },
        configurationUtilities,
        true,
        'slackUserToken'
      )
    ).rejects.toThrow('Unable to extract access token');
  });

  test('throws and logs warning on non-200 response', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockResolvedValueOnce({
      status: 400,
      data: { error: 'invalid_grant' },
    });

    await expect(
      requestOAuthAuthorizationCodeToken(
        'https://slack.com/api/oauth.v2.access',
        mockLogger,
        {
          code: 'code',
          redirectUri: 'https://kibana.example.com/callback',
          codeVerifier: 'verifier',
          clientId: 'client',
          clientSecret: 'secret',
        },
        configurationUtilities,
        true
      )
    ).rejects.toBeDefined();

    expect(mockLogger.warn).toHaveBeenCalled();
  });
});

