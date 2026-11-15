/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE } from '../../constants/saved_objects';
import { deleteIngressCredentialForConnector } from './delete_ingress_credential';

describe('deleteIngressCredentialForConnector', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns when no credentials exist', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      page: 1,
      per_page: 10,
    } as never);

    await deleteIngressCredentialForConnector({
      unsecuredSavedObjectsClient,
      connectorId: 'connector-1',
      logger,
    });

    expect(unsecuredSavedObjectsClient.bulkDelete).not.toHaveBeenCalled();
  });

  it('throws when bulkDelete reports a failure', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        {
          id: 'old-cred',
          type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
          attributes: {
            connectorId: 'connector-1',
            ingestTokenHash: 'b'.repeat(64),
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          references: [],
        },
      ],
      total: 1,
      page: 1,
      per_page: 10,
    } as never);
    unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
      statuses: [
        { id: 'old-cred', type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE, success: false },
      ],
    } as never);

    await expect(
      deleteIngressCredentialForConnector({
        unsecuredSavedObjectsClient,
        connectorId: 'connector-1',
        logger,
      })
    ).rejects.toThrow('Failed to delete 1 ingest credential(s) for connector "connector-1"');
    expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
      { type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE, id: 'old-cred' },
    ]);
  });

  it('does not delete keepCredentialId', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        {
          id: 'old-cred',
          type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
          attributes: {
            connectorId: 'connector-1',
            ingestTokenHash: 'b'.repeat(64),
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          references: [],
        },
        {
          id: 'new-cred',
          type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
          attributes: {
            connectorId: 'connector-1',
            ingestTokenHash: 'c'.repeat(64),
            createdAt: '2026-01-02T00:00:00.000Z',
          },
          references: [],
        },
      ],
      total: 2,
      page: 1,
      per_page: 10,
    } as never);
    unsecuredSavedObjectsClient.bulkDelete.mockResolvedValue({
      statuses: [
        { id: 'old-cred', type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE, success: true },
      ],
    } as never);

    await deleteIngressCredentialForConnector({
      unsecuredSavedObjectsClient,
      connectorId: 'connector-1',
      logger,
      keepCredentialId: 'new-cred',
    });

    expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
      { type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE, id: 'old-cred' },
    ]);
  });

  it('returns without bulkDelete when only keepCredentialId remains', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        {
          id: 'new-cred',
          type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
          attributes: {
            connectorId: 'connector-1',
            ingestTokenHash: 'c'.repeat(64),
            createdAt: '2026-01-02T00:00:00.000Z',
          },
          references: [],
        },
      ],
      total: 1,
      page: 1,
      per_page: 10,
    } as never);

    await deleteIngressCredentialForConnector({
      unsecuredSavedObjectsClient,
      connectorId: 'connector-1',
      logger,
      keepCredentialId: 'new-cred',
    });

    expect(unsecuredSavedObjectsClient.bulkDelete).not.toHaveBeenCalled();
  });
});
