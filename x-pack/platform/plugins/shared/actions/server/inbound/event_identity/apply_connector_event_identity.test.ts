/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock, securityServiceMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import type { Logger } from '@kbn/logging';

import type { ActionsClientContext } from '../../actions_client';
import {
  invalidateInboundConnectorEventIdentity,
  loadPreviousConnectorEventIdentity,
  mintInboundEventIdentityAttributes,
} from './apply_connector_event_identity';
import { encodeApiKey } from './encode_api_key';
import { connectorEventIdentityApiKeyName } from './types';

const request = httpServerMock.createKibanaRequest();
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

const createContext = (overrides: Partial<ActionsClientContext> = {}): ActionsClientContext =>
  ({
    request,
    logger,
    isESOCanEncrypt: true,
    encryptedSavedObjectsClient: encryptedSavedObjectsMock.createClient(),
    ...overrides,
  } as ActionsClientContext);

describe('mintInboundEventIdentityAttributes', () => {
  test('returns undefined for non-inbound connectors', async () => {
    const result = await mintInboundEventIdentityAttributes(createContext(), {
      connectorId: 'c1',
      actionTypeId: '.slack',
    });

    expect(result).toBeUndefined();
  });

  test('throws 400 when encryption is unavailable', async () => {
    await expect(
      mintInboundEventIdentityAttributes(createContext({ isESOCanEncrypt: false }), {
        connectorId: 'c1',
        actionTypeId: '.inboundWebhook',
      })
    ).rejects.toThrow('encrypted saved objects are not available');
  });

  test('mints identity attributes for an inbound connector', async () => {
    const securityService = securityServiceMock.createStart();
    (securityService.authc.apiKeys as { uiam?: unknown }).uiam = undefined;
    securityService.authc.apiKeys.grantAsInternalUser.mockResolvedValue({
      id: 'es-id',
      name: connectorEventIdentityApiKeyName('c1'),
      api_key: 'es-secret',
    });

    const result = await mintInboundEventIdentityAttributes(createContext({ securityService }), {
      connectorId: 'c1',
      actionTypeId: '.inboundWebhook',
    });

    expect(result).toEqual({
      apiKey: encodeApiKey('es-id', 'es-secret'),
    });
  });
});

describe('loadPreviousConnectorEventIdentity', () => {
  test('returns the decrypted identity', async () => {
    const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: 'c1',
      type: 'action',
      attributes: {
        actionTypeId: '.inboundWebhook',
        name: 'ingress',
        isMissingSecrets: false,
        config: {},
        secrets: {},
        apiKey: encodeApiKey('old-id', 'old-secret'),
      },
      references: [],
    } as never);

    const identity = await loadPreviousConnectorEventIdentity(
      createContext({ encryptedSavedObjectsClient, spaceId: 'default' }),
      'c1'
    );

    expect(identity).toEqual({ apiKey: encodeApiKey('old-id', 'old-secret') });
  });

  test('logs and returns undefined when decrypt fails', async () => {
    const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockRejectedValue(
      new Error('cannot decrypt')
    );

    const identity = await loadPreviousConnectorEventIdentity(
      createContext({ encryptedSavedObjectsClient }),
      'c1'
    );

    expect(identity).toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to decrypt previous connector event identity')
    );
  });
});

describe('invalidateInboundConnectorEventIdentity', () => {
  test('does not decrypt non-inbound connectors', async () => {
    const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();

    await invalidateInboundConnectorEventIdentity(
      createContext({ encryptedSavedObjectsClient }),
      'c1',
      '.slack'
    );

    expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
  });

  test('decrypts and invalidates the stored ES key', async () => {
    const securityService = securityServiceMock.createStart();
    securityService.authc.apiKeys.invalidateAsInternalUser.mockResolvedValue({
      invalidated_api_keys: ['old-id'],
      previously_invalidated_api_keys: [],
      error_count: 0,
    });
    const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: 'c1',
      type: 'action',
      attributes: {
        actionTypeId: '.inboundWebhook',
        name: 'ingress',
        isMissingSecrets: false,
        config: {},
        secrets: {},
        apiKey: encodeApiKey('old-id', 'old-secret'),
      },
      references: [],
    } as never);

    await invalidateInboundConnectorEventIdentity(
      createContext({ securityService, encryptedSavedObjectsClient, spaceId: 'default' }),
      'c1',
      '.inboundWebhook'
    );

    expect(securityService.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledWith({
      ids: ['old-id'],
    });
  });
});
