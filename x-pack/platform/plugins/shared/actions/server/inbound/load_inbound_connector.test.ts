/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import { ACTION_SAVED_OBJECT_TYPE } from '../constants/saved_objects';
import { loadInboundConnector } from './load_inbound_connector';

describe('loadInboundConnector', () => {
  const logger = loggingSystemMock.createLogger();
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads an in-memory connector when ids match', async () => {
    const result = await loadInboundConnector({
      connectorId: 'mem-1',
      connectorTypeId: 'myConnector',
      spaceId: 'default',
      unsecuredSavedObjectsClient,
      inMemoryConnectors: [
        {
          id: 'mem-1',
          actionTypeId: '.myConnector',
          name: 'Memory',
          config: { ingestTokenHash: 'hash' },
          secrets: {},
          isMissingSecrets: false,
          isPreconfigured: true,
          isSystemAction: false,
          isDeprecated: false,
          isConnectorTypeDeprecated: false,
        },
      ],
      logger,
    });

    expect(result).toEqual({
      connectorId: 'mem-1',
      connectorTypeId: '.myConnector',
      spaceId: 'default',
      config: { ingestTokenHash: 'hash' },
    });
    expect(unsecuredSavedObjectsClient.get).not.toHaveBeenCalled();
  });

  it('returns undefined when in-memory type does not match', async () => {
    const result = await loadInboundConnector({
      connectorId: 'mem-1',
      connectorTypeId: '.other',
      spaceId: 'default',
      unsecuredSavedObjectsClient,
      inMemoryConnectors: [
        {
          id: 'mem-1',
          actionTypeId: '.myConnector',
          name: 'Memory',
          config: {},
          secrets: {},
          isMissingSecrets: false,
          isPreconfigured: true,
          isSystemAction: false,
          isDeprecated: false,
          isConnectorTypeDeprecated: false,
        },
      ],
      logger,
    });
    expect(result).toBeUndefined();
  });

  it('loads a saved object connector and normalizes type id', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValue({
      id: 'so-1',
      type: ACTION_SAVED_OBJECT_TYPE,
      references: [],
      attributes: {
        actionTypeId: '.myConnector',
        name: 'SO',
        isMissingSecrets: false,
        config: { ingestTokenHash: 'abc' },
        secrets: {},
      },
    });

    const result = await loadInboundConnector({
      connectorId: 'so-1',
      connectorTypeId: 'myConnector',
      spaceId: 'space-a',
      unsecuredSavedObjectsClient,
      inMemoryConnectors: [],
      logger,
    });

    expect(unsecuredSavedObjectsClient.get).toHaveBeenCalledWith(ACTION_SAVED_OBJECT_TYPE, 'so-1');
    expect(result).toEqual({
      connectorId: 'so-1',
      connectorTypeId: '.myConnector',
      spaceId: 'space-a',
      config: { ingestTokenHash: 'abc' },
    });
  });

  it('returns undefined when the saved object cannot be loaded', async () => {
    unsecuredSavedObjectsClient.get.mockRejectedValue(new Error('not found'));
    const result = await loadInboundConnector({
      connectorId: 'missing',
      connectorTypeId: '.myConnector',
      spaceId: 'default',
      unsecuredSavedObjectsClient,
      inMemoryConnectors: [],
      logger,
    });
    expect(result).toBeUndefined();
    expect(logger.debug).toHaveBeenCalled();
  });

  it('returns undefined when saved object actionTypeId does not match', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValue({
      id: 'so-1',
      type: ACTION_SAVED_OBJECT_TYPE,
      references: [],
      attributes: {
        actionTypeId: '.otherConnector',
        name: 'SO',
        isMissingSecrets: false,
        config: { ingestTokenHash: 'abc' },
        secrets: {},
      },
    });

    const result = await loadInboundConnector({
      connectorId: 'so-1',
      connectorTypeId: '.myConnector',
      spaceId: 'space-a',
      unsecuredSavedObjectsClient,
      inMemoryConnectors: [],
      logger,
    });
    expect(result).toBeUndefined();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('type mismatch'));
  });
});
