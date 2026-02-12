/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateMicrosoftDefenderConnectorMockResponse } from './mocks';
import { microsoftDefenderEndpointConnectorMocks } from './mocks';
import { OAuthTokenManager } from './o_auth_token_manager';
import type { ConnectorTokenClientContract } from '@kbn/actions-plugin/server/types';

describe('Microsoft Defender for Endpoint oAuth token manager', () => {
  let testMock: CreateMicrosoftDefenderConnectorMockResponse;
  let msOAuthManagerMock: OAuthTokenManager;
  let connectorTokenManagerClientMock: jest.Mocked<ConnectorTokenClientContract>;

  beforeEach(() => {
    testMock = microsoftDefenderEndpointConnectorMocks.create();
    connectorTokenManagerClientMock = jest.mocked(testMock.options.services.connectorTokenClient);
    msOAuthManagerMock = new OAuthTokenManager({
      ...testMock.options,
      apiRequest: async (...args) => testMock.instanceMock.request(...args),
    });
  });

  describe('#get()', () => {
    it('should call MS api to generate new token', async () => {
      await msOAuthManagerMock.get(testMock.usageCollector);

      expect(testMock.instanceMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${testMock.options.config.oAuthServerUrl}/${testMock.options.config.tenantId}/oauth2/v2.0/token`,
          method: 'POST',
          data: {
            grant_type: 'client_credentials',
            client_id: testMock.options.config.clientId,
            scope: testMock.options.config.oAuthScope,
            client_secret: testMock.options.secrets.clientSecret,
          },
        }),
        testMock.usageCollector
      );
    });

    it('should use cached token when one exists', async () => {
      const {
        connectorId,
        token,
        expiresAt: expiresAtMillis,
        tokenType,
      } = microsoftDefenderEndpointConnectorMocks.createConnectorToken();
      await connectorTokenManagerClientMock.create({
        connectorId,
        token,
        expiresAtMillis,
        tokenType,
      });
      await msOAuthManagerMock.get(testMock.usageCollector);

      expect(testMock.instanceMock.request).not.toHaveBeenCalled();
      expect(connectorTokenManagerClientMock.get).toHaveBeenCalledWith({
        connectorId: '1',
        tokenType: 'access_token',
      });
    });

    it('should call MS API to generate new token when the cached token is expired', async () => {
      const { connectorId, token, tokenType } =
        microsoftDefenderEndpointConnectorMocks.createConnectorToken();
      await connectorTokenManagerClientMock.create({
        connectorId,
        token,
        expiresAtMillis: '2024-01-16T13:02:43.494Z',
        tokenType,
      });
      await msOAuthManagerMock.get(testMock.usageCollector);

      expect(connectorTokenManagerClientMock.get).toHaveBeenCalledWith({
        connectorId: '1',
        tokenType: 'access_token',
      });
      expect(testMock.instanceMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${testMock.options.config.oAuthServerUrl}/${testMock.options.config.tenantId}/oauth2/v2.0/token`,
        }),
        testMock.usageCollector
      );
    });
  });

  describe('#generateNew()', () => {
    it('should call microsoft api to get new token', async () => {
      await msOAuthManagerMock.generateNew(testMock.usageCollector);

      expect(testMock.instanceMock.request).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${testMock.options.config.oAuthServerUrl}/${testMock.options.config.tenantId}/oauth2/v2.0/token`,
        }),
        testMock.usageCollector
      );
    });

    it('should use stored token if it is different since the last time it was read', async () => {
      await msOAuthManagerMock.get(testMock.usageCollector);
      const { connectorId, tokenType } =
        microsoftDefenderEndpointConnectorMocks.createConnectorToken();
      await connectorTokenManagerClientMock.create({
        connectorId,
        token: 'different-token-here',
        expiresAtMillis: '2050-01-16T13:02:43.494Z',
        tokenType,
      });
      connectorTokenManagerClientMock.get.mockClear();
      testMock.instanceMock.request.mockClear();
      await msOAuthManagerMock.generateNew(testMock.usageCollector);

      expect(connectorTokenManagerClientMock.get).toHaveBeenCalledTimes(1);
      expect(testMock.instanceMock.request).not.toHaveBeenCalled();
    });
  });
});
