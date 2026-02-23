/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { connectorTokenClientMock } from './connector_token_client.mock';
import { getOAuthAuthorizationCodeAccessToken } from './get_oauth_authorization_code_access_token';
import { requestOAuthRefreshToken } from './request_oauth_refresh_token';

jest.mock('./request_oauth_refresh_token', () => ({
  requestOAuthRefreshToken: jest.fn(),
}));

// Token lifecycle behaviour (expiry, refresh, persistence, errors) is covered in
// get_stored_oauth_token_with_refresh.test.ts. This file covers only what is unique
// to the OAuth Authorization Code wrapper: credential validation and argument wiring.

const NOW = new Date('2024-01-15T12:00:00.000Z');

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const configurationUtilities = actionsConfigMock.create();
const connectorTokenClient = connectorTokenClientMock.create();

// An expired token so that the refresh path is exercised in the argument-wiring tests
const expiredToken = {
  id: 'token-1',
  connectorId: 'connector-1',
  tokenType: 'access_token',
  token: 'stored-access-token',
  createdAt: new Date('2024-01-15T10:00:00.000Z').toISOString(),
  expiresAt: new Date('2024-01-15T11:00:00.000Z').toISOString(),
  refreshToken: 'stored-refresh-token',
  refreshTokenExpiresAt: new Date('2024-01-22T12:00:00.000Z').toISOString(),
};

const refreshResponse = {
  tokenType: 'Bearer',
  accessToken: 'new-access-token',
  expiresIn: 3600,
  refreshToken: 'new-refresh-token',
  refreshTokenExpiresIn: 604800,
};

const baseOpts = {
  connectorId: 'connector-1',
  logger,
  configurationUtilities,
  credentials: {
    config: {
      clientId: 'my-client-id',
      tokenUrl: 'https://auth.example.com/oauth/token',
    },
    secrets: {
      clientSecret: 'my-client-secret',
    },
  },
  connectorTokenClient,
};

let clock: sinon.SinonFakeTimers;

describe('getOAuthAuthorizationCodeAccessToken', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers(NOW);
  });
  beforeEach(() => {
    clock.reset();
    jest.resetAllMocks();
  });
  afterAll(() => clock.restore());

  describe('credential validation', () => {
    it('returns null and warns when clientId is missing', async () => {
      const result = await getOAuthAuthorizationCodeAccessToken({
        ...baseOpts,
        credentials: {
          ...baseOpts.credentials,
          config: { ...baseOpts.credentials.config, clientId: '' },
        },
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Missing required fields for requesting OAuth Authorization Code access token'
      );
      expect(connectorTokenClient.get).not.toHaveBeenCalled();
    });

    it('returns null and warns when clientSecret is missing', async () => {
      const result = await getOAuthAuthorizationCodeAccessToken({
        ...baseOpts,
        credentials: { ...baseOpts.credentials, secrets: { clientSecret: '' } },
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        'Missing required fields for requesting OAuth Authorization Code access token'
      );
      expect(connectorTokenClient.get).not.toHaveBeenCalled();
    });
  });

  describe('requestOAuthRefreshToken argument wiring', () => {
    beforeEach(() => {
      connectorTokenClient.get.mockResolvedValue({
        hasErrors: false,
        connectorToken: expiredToken,
      });
      (requestOAuthRefreshToken as jest.Mock).mockResolvedValue(refreshResponse);
    });

    it('passes tokenUrl, clientId, clientSecret, and scope to requestOAuthRefreshToken', async () => {
      await getOAuthAuthorizationCodeAccessToken({ ...baseOpts, scope: 'openid profile' });

      expect(requestOAuthRefreshToken).toHaveBeenCalledWith(
        'https://auth.example.com/oauth/token',
        logger,
        {
          refreshToken: 'stored-refresh-token',
          clientId: 'my-client-id',
          clientSecret: 'my-client-secret',
          scope: 'openid profile',
        },
        configurationUtilities,
        true // useBasicAuth defaults to true
      );
    });

    it('spreads additionalFields into the refresh request body', async () => {
      await getOAuthAuthorizationCodeAccessToken({
        ...baseOpts,
        credentials: {
          ...baseOpts.credentials,
          config: {
            ...baseOpts.credentials.config,
            additionalFields: { tenant_id: 'abc123', custom_flag: true },
          },
        },
      });

      expect(requestOAuthRefreshToken).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({ tenant_id: 'abc123', custom_flag: true }),
        expect.any(Object),
        expect.any(Boolean)
      );
    });

    it('passes useBasicAuth: false when explicitly configured', async () => {
      await getOAuthAuthorizationCodeAccessToken({
        ...baseOpts,
        credentials: {
          ...baseOpts.credentials,
          config: { ...baseOpts.credentials.config, useBasicAuth: false },
        },
      });

      expect(requestOAuthRefreshToken).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        false
      );
    });
  });
});
