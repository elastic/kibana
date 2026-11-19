/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, securityServiceMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/logging';

import { encodeApiKey } from './encode_api_key';
import { invalidateConnectorEventIdentity } from './invalidate_connector_event_identity';

describe('invalidateConnectorEventIdentity', () => {
  const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('invalidates the ES key as the internal user', async () => {
    const securityService = securityServiceMock.createStart();
    securityService.authc.apiKeys.invalidateAsInternalUser.mockResolvedValue({
      invalidated_api_keys: ['es-id'],
      previously_invalidated_api_keys: [],
      error_count: 0,
    });

    await invalidateConnectorEventIdentity({
      identity: { apiKey: encodeApiKey('es-id', 'es-secret')! },
      securityService,
      logger,
      connectorId: 'connector-1',
    });

    expect(securityService.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledWith({
      ids: ['es-id'],
    });
    expect(securityService.authc.apiKeys.uiam!.invalidate).not.toHaveBeenCalled();
  });

  test('invalidates a framework UIAM key using a forged request', async () => {
    const securityService = securityServiceMock.createStart();
    securityService.authc.apiKeys.uiam!.invalidate.mockResolvedValue({
      invalidated_api_keys: ['uiam-id'],
      previously_invalidated_api_keys: [],
      error_count: 0,
    });

    await invalidateConnectorEventIdentity({
      identity: { uiamApiKey: encodeApiKey('uiam-id', 'essu_granted')! },
      securityService,
      logger,
      connectorId: 'connector-1',
    });

    expect(securityService.authc.apiKeys.uiam!.invalidate).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'ApiKey essu_granted',
        }),
      }),
      { id: 'uiam-id' }
    );
  });

  test('logs and does not throw when ES invalidation fails', async () => {
    const securityService = securityServiceMock.createStart();
    securityService.authc.apiKeys.invalidateAsInternalUser.mockRejectedValue(
      new Error('cannot invalidate')
    );

    await expect(
      invalidateConnectorEventIdentity({
        identity: { apiKey: encodeApiKey('es-id', 'es-secret')! },
        securityService,
        logger,
        connectorId: 'connector-1',
      })
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to invalidate ES API key'),
      expect.any(Object)
    );
  });
});
