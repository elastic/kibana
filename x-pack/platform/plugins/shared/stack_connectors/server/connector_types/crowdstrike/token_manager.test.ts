/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CrowdStrikeTokenManager } from './token_manager';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import type { ServiceParams } from '@kbn/actions-plugin/server';
import type { CrowdstrikeConfig, CrowdstrikeSecrets } from '@kbn/connector-schemas/crowdstrike';
import type { ConnectorTokenClient } from '@kbn/actions-plugin/server/lib/connector_token_client';
import type { ConnectorToken } from '@kbn/actions-plugin/server/types';

describe('CrowdStrikeTokenManager', () => {
  let csTokenManager: CrowdStrikeTokenManager;
  let connectorTokenClientMock: jest.Mocked<ConnectorTokenClient>;
  let usageCollector: ConnectorUsageCollector;
  let mockRequest: jest.Mock;

  const createConnectorTokenMock = (overrides: Partial<ConnectorToken> = {}): ConnectorToken => {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    return {
      id: '1',
      connectorId: 'connector-id',
      tokenType: 'access_token',
      token: 'testtokenvalue',
      expiresAt: expiresAt.toISOString(),
      createdAt: '2025-01-16T13:02:43.494Z',
      updatedAt: '2025-01-16T13:02:43.494Z',
      ...overrides,
    };
  };

  beforeEach(() => {
    mockRequest = jest.fn();
    const mockServices = actionsMock.createServices();
    connectorTokenClientMock =
      mockServices.connectorTokenClient as jest.Mocked<ConnectorTokenClient>;

    // Apply connector token client mock behavior
    let cachedTokenMock: ConnectorToken | null = null;

    jest
      .spyOn(connectorTokenClientMock, 'create')
      .mockImplementation(
        async ({ connectorId, token, expiresAtMillis: expiresAt, tokenType = 'access_token' }) => {
          cachedTokenMock = createConnectorTokenMock({
            connectorId,
            token,
            expiresAt,
            tokenType,
          });
          return cachedTokenMock;
        }
      );

    jest
      .spyOn(connectorTokenClientMock, 'update')
      .mockImplementation(
        async ({ token, expiresAtMillis: expiresAt, tokenType = 'access_token' }) => {
          if (cachedTokenMock) {
            cachedTokenMock = {
              ...cachedTokenMock,
              token,
              expiresAt,
              tokenType,
            };
          }
          return cachedTokenMock;
        }
      );

    jest.spyOn(connectorTokenClientMock, 'get').mockImplementation(async () => {
      return { hasErrors: !cachedTokenMock, connectorToken: cachedTokenMock };
    });

    jest.spyOn(connectorTokenClientMock, 'updateOrReplace').mockImplementation(async (options) => {
      // Calculate expiration time based on expiresInSec
      const expiresAt = new Date(
        options.tokenRequestDate + options.expiresInSec * 1000
      ).toISOString();
      cachedTokenMock = createConnectorTokenMock({
        connectorId: options.connectorId,
        token: options.newToken,
        expiresAt,
        tokenType: 'access_token',
      });
    });

    jest.spyOn(connectorTokenClientMock, 'deleteConnectorTokens').mockImplementation(async () => {
      cachedTokenMock = null;
      return [];
    });

    const serviceParams: ServiceParams<CrowdstrikeConfig, CrowdstrikeSecrets> & {
      apiRequest: jest.Mock;
    } = {
      configurationUtilities: actionsConfigMock.create(),
      connector: { id: 'connector-id', type: '.crowdstrike' },
      config: { url: 'https://api.crowdstrike.com' },
      secrets: { clientId: 'test-client-id', clientSecret: 'test-client-secret' },
      logger: loggingSystemMock.createLogger(),
      services: mockServices,
      apiRequest: mockRequest,
    };

    csTokenManager = new CrowdStrikeTokenManager(serviceParams);

    usageCollector = new ConnectorUsageCollector({
      logger: serviceParams.logger,
      connectorId: 'test-connector-id',
    });

    // Default API response for token requests
    mockRequest.mockResolvedValue({
      data: {
        token_type: 'bearer',
        expires_in: 1799,
        access_token: 'test-access-token-from-api',
      },
    });

    jest.clearAllMocks();
  });

  describe('#get()', () => {
    it('should call CrowdStrike API to generate new token', async () => {
      await csTokenManager.get(usageCollector);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.crowdstrike.com/oauth2/token',
          method: 'post',
          headers: expect.objectContaining({
            authorization: `Basic ${Buffer.from('test-client-id:test-client-secret').toString(
              'base64'
            )}`,
          }),
        }),
        usageCollector
      );
    });

    it('should use cached token when one exists', async () => {
      const {
        connectorId,
        token,
        expiresAt: expiresAtMillis,
        tokenType,
      } = createConnectorTokenMock();
      await connectorTokenClientMock.create({
        connectorId,
        token,
        expiresAtMillis,
        tokenType,
      });
      await csTokenManager.get(usageCollector);

      expect(mockRequest).not.toHaveBeenCalled();
      expect(connectorTokenClientMock.get).toHaveBeenCalledWith({
        connectorId: 'connector-id',
        tokenType: 'access_token',
      });
    });

    it('should call CrowdStrike API to generate new token when the cached token is expired', async () => {
      const { connectorId, token, tokenType } = createConnectorTokenMock();
      await connectorTokenClientMock.create({
        connectorId,
        token,
        expiresAtMillis: '2024-01-16T13:02:43.494Z',
        tokenType,
      });
      await csTokenManager.get(usageCollector);

      expect(connectorTokenClientMock.get).toHaveBeenCalledWith({
        connectorId: 'connector-id',
        tokenType: 'access_token',
      });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.crowdstrike.com/oauth2/token',
        }),
        usageCollector
      );
    });
  });

  describe('#generateNew()', () => {
    it('should call CrowdStrike API to get new token', async () => {
      await csTokenManager.generateNew(usageCollector);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.crowdstrike.com/oauth2/token',
        }),
        usageCollector
      );
    });

    it('should use stored token if it is different since the last time it was read', async () => {
      await csTokenManager.get(usageCollector);
      const { connectorId, tokenType } = createConnectorTokenMock();
      await connectorTokenClientMock.create({
        connectorId,
        token: 'different-token-here',
        expiresAtMillis: '2050-01-16T13:02:43.494Z',
        tokenType,
      });
      connectorTokenClientMock.get.mockClear();
      mockRequest.mockClear();
      await csTokenManager.generateNew(usageCollector);

      expect(connectorTokenClientMock.get).toHaveBeenCalledTimes(1);
      expect(mockRequest).not.toHaveBeenCalled();
    });
  });
});
