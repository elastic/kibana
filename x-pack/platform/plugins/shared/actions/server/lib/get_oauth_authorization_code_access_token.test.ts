/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/core/server';
import { actionsConfigMock } from '../actions_config.mock';
import { getOAuthAuthorizationCodeAccessToken } from './get_oauth_authorization_code_access_token';
import * as refreshModule from './request_oauth_refresh_token';

jest.mock('./request_oauth_refresh_token', () => ({
  requestOAuthRefreshToken: jest.fn(),
}));

const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

describe('getOAuthAuthorizationCodeAccessToken', () => {
  const configurationUtilities = actionsConfigMock.create();

  test('returns existing access token when valid', async () => {
    const connectorTokenClient = {
      get: jest.fn().mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: 'a1',
          connectorId: 'c1',
          tokenType: 'access_token',
          token: 'Bearer existing',
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        },
      }),
      updateOrReplace: jest.fn(),
    };

    const result = await getOAuthAuthorizationCodeAccessToken({
      connectorId: 'c1',
      tokenUrl: 'https://provider/token',
      logger: mockLogger,
      configurationUtilities,
      credentials: { config: { clientId: 'id' }, secrets: { clientSecret: 'sec' } },
      connectorTokenClient: connectorTokenClient as any,
    });

    expect(result).toBe('Bearer existing');
    expect(connectorTokenClient.updateOrReplace).not.toHaveBeenCalled();
  });

  test('refreshes when access token expired and refresh token exists', async () => {
    const connectorTokenClient = {
      get: jest
        .fn()
        .mockResolvedValueOnce({
          hasErrors: false,
          connectorToken: {
            id: 'a1',
            connectorId: 'c1',
            tokenType: 'access_token',
            token: 'Bearer expired',
            expiresAt: new Date(Date.now() - 1).toISOString(),
          },
        })
        .mockResolvedValueOnce({
          hasErrors: false,
          connectorToken: {
            id: 'r1',
            connectorId: 'c1',
            tokenType: 'refresh_token',
            token: 'refresh-1',
            expiresAt: new Date(Date.now() + 60_000).toISOString(),
          },
        }),
      updateOrReplace: jest.fn().mockResolvedValue(undefined),
    };

    (refreshModule.requestOAuthRefreshToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'Bearer',
      accessToken: 'new-access',
      expiresIn: 3600,
    });

    const result = await getOAuthAuthorizationCodeAccessToken({
      connectorId: 'c1',
      tokenUrl: 'https://provider/token',
      logger: mockLogger,
      configurationUtilities,
      credentials: { config: { clientId: 'id' }, secrets: { clientSecret: 'sec' } },
      connectorTokenClient: connectorTokenClient as any,
    });

    expect(result).toBe('Bearer new-access');
    expect(connectorTokenClient.updateOrReplace).toHaveBeenCalledWith(
      expect.objectContaining({ connectorId: 'c1', tokenType: 'access_token' })
    );
  });

  test('returns null when no refresh token available', async () => {
    const connectorTokenClient = {
      get: jest
        .fn()
        .mockResolvedValueOnce({ hasErrors: false, connectorToken: null })
        .mockResolvedValueOnce({ hasErrors: false, connectorToken: null }),
      updateOrReplace: jest.fn(),
    };

    const result = await getOAuthAuthorizationCodeAccessToken({
      connectorId: 'c1',
      tokenUrl: 'https://provider/token',
      logger: mockLogger,
      configurationUtilities,
      credentials: { config: { clientId: 'id' }, secrets: { clientSecret: 'sec' } },
      connectorTokenClient: connectorTokenClient as any,
    });

    expect(result).toBeNull();
  });
});

