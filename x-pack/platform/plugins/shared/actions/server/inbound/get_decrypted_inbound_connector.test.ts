/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

import { ACTION_SAVED_OBJECT_TYPE } from '../constants/saved_objects';
import { getDecryptedInboundConnector } from './get_decrypted_inbound_connector';

describe('getDecryptedInboundConnector', () => {
  it('decrypts the action SO as the internal user', async () => {
    const coreSetup = coreMock.createSetup();
    const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: 'c1',
      type: ACTION_SAVED_OBJECT_TYPE,
      attributes: {
        actionTypeId: '.inboundWebhook',
        name: 'ingress',
        isMissingSecrets: false,
        config: {},
        secrets: {},
        apiKey: 'encoded-key',
      },
      references: [],
    } as never);

    const encryptedSavedObjects = encryptedSavedObjectsMock.createStart();
    encryptedSavedObjects.getClient.mockReturnValue(encryptedSavedObjectsClient);
    coreSetup.getStartServices.mockResolvedValue([
      coreMock.createStart(),
      { encryptedSavedObjects },
      {},
    ] as never);

    const attributes = await getDecryptedInboundConnector({
      getStartServices: coreSetup.getStartServices,
      connectorId: 'c1',
      spaceId: 'default',
    });

    expect(encryptedSavedObjects.getClient).toHaveBeenCalledWith({
      includedHiddenTypes: [ACTION_SAVED_OBJECT_TYPE],
    });
    expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      ACTION_SAVED_OBJECT_TYPE,
      'c1',
      {}
    );
    expect(attributes.apiKey).toBe('encoded-key');
  });

  it('passes the space namespace when not default', async () => {
    const coreSetup = coreMock.createSetup();
    const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
    encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValue({
      id: 'c1',
      type: ACTION_SAVED_OBJECT_TYPE,
      attributes: {
        actionTypeId: '.inboundWebhook',
        name: 'ingress',
        isMissingSecrets: false,
        config: {},
        secrets: {},
      },
      references: [],
    } as never);

    const encryptedSavedObjects = encryptedSavedObjectsMock.createStart();
    encryptedSavedObjects.getClient.mockReturnValue(encryptedSavedObjectsClient);
    coreSetup.getStartServices.mockResolvedValue([
      coreMock.createStart(),
      { encryptedSavedObjects },
      {},
    ] as never);

    await getDecryptedInboundConnector({
      getStartServices: coreSetup.getStartServices,
      connectorId: 'c1',
      spaceId: 'sales',
    });

    expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      ACTION_SAVED_OBJECT_TYPE,
      'c1',
      { namespace: 'sales' }
    );
  });
});
