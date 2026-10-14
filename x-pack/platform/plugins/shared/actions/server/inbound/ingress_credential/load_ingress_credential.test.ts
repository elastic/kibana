/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';

import { CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE } from '../../constants/saved_objects';
import { loadIngressCredential } from './load_ingress_credential';

describe('loadIngressCredential', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns attributes when the credential is bound to the connector', async () => {
    unsecuredSavedObjectsClient.get.mockResolvedValue({
      id: 'cred-1',
      type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
      attributes: {
        connectorId: 'connector-1',
        ingestTokenHash: 'a'.repeat(64),
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      references: [],
    } as never);

    await expect(
      loadIngressCredential({
        unsecuredSavedObjectsClient,
        credentialId: 'cred-1',
        connectorId: 'connector-1',
      })
    ).resolves.toEqual(expect.objectContaining({ connectorId: 'connector-1' }));
  });

  it('returns undefined when missing or bound to another connector', async () => {
    unsecuredSavedObjectsClient.get.mockRejectedValueOnce(
      SavedObjectsErrorHelpers.createGenericNotFoundError(
        CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
        'missing'
      )
    );
    await expect(
      loadIngressCredential({
        unsecuredSavedObjectsClient,
        credentialId: 'missing',
        connectorId: 'connector-1',
      })
    ).resolves.toBeUndefined();

    unsecuredSavedObjectsClient.get.mockResolvedValueOnce({
      id: 'cred-1',
      type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
      attributes: {
        connectorId: 'other',
        ingestTokenHash: 'a'.repeat(64),
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      references: [],
    } as never);
    await expect(
      loadIngressCredential({
        unsecuredSavedObjectsClient,
        credentialId: 'cred-1',
        connectorId: 'connector-1',
      })
    ).resolves.toBeUndefined();
  });
});
