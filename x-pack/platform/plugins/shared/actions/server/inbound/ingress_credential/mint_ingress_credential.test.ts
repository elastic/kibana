/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { auditLoggerMock } from '@kbn/security-plugin/server/audit/mocks';

import { INBOUND_EVENTS_TOKEN_MAX_LENGTH } from '../../../common/inbound_events';
import { CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE } from '../../constants/saved_objects';
import { computeIngestTokenHash } from '../compute_ingest_token_hash';
import { mintIngressCredential } from './mint_ingress_credential';
import { parseIngestToken } from './parse_ingest_token';

const previousCredential = {
  id: 'old-cred',
  type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
  attributes: {
    connectorId: 'connector-1',
    ingestTokenHash: 'b'.repeat(64),
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  references: [],
};

describe('mintIngressCredential', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();
  const logger = loggingSystemMock.createLogger();
  const auditLogger = auditLoggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
    unsecuredSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      page: 1,
      per_page: 10,
    } as never);
    unsecuredSavedObjectsClient.create.mockImplementation(async (type, attributes, options) => ({
      id: options?.id ?? 'id',
      type,
      attributes,
      references: options?.references ?? [],
    }));
  });

  it('creates a random-id credential and returns a parseable token', async () => {
    const result = await mintIngressCredential({
      unsecuredSavedObjectsClient,
      connectorId: 'connector-1',
      spaceId: 'default',
      auditLogger,
      logger,
    });

    const parsed = parseIngestToken(result.ingestToken);
    expect(parsed?.credentialId).toBe(result.credentialId);
    expect(result.credentialId).not.toBe('connector-1');
    expect(result.ingestToken.length).toBeLessThanOrEqual(INBOUND_EVENTS_TOKEN_MAX_LENGTH);
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalledWith(
      CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
      {
        connectorId: 'connector-1',
        ingestTokenHash: computeIngestTokenHash({
          connectorId: 'connector-1',
          spaceId: 'default',
          token: result.ingestToken,
        }),
        createdAt: expect.any(String),
      },
      expect.objectContaining({
        id: result.credentialId,
        references: [{ name: 'connector', type: 'action', id: 'connector-1' }],
      })
    );
    expect(unsecuredSavedObjectsClient.create.mock.calls[0][2]).not.toEqual(
      expect.objectContaining({ overwrite: true })
    );
    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('User has rotated'),
        event: expect.objectContaining({
          action: 'connector_ingress_rotate',
          outcome: 'success',
        }),
      })
    );
  });

  it('creates the new credential before deleting previous ones and keeps the new id', async () => {
    const generateIdSpy = jest.spyOn(SavedObjectsUtils, 'generateId').mockReturnValue('new-cred');
    unsecuredSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        previousCredential,
        {
          ...previousCredential,
          id: 'new-cred',
          attributes: {
            ...previousCredential.attributes,
            ingestTokenHash: 'c'.repeat(64),
          },
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

    try {
      const result = await mintIngressCredential({
        unsecuredSavedObjectsClient,
        connectorId: 'connector-1',
        spaceId: 'default',
        auditLogger,
        logger,
      });

      expect(result.credentialId).toBe('new-cred');
      expect(unsecuredSavedObjectsClient.create).toHaveBeenCalled();
      expect(unsecuredSavedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE, id: 'old-cred' },
      ]);
      expect(unsecuredSavedObjectsClient.create.mock.invocationCallOrder[0]).toBeLessThan(
        unsecuredSavedObjectsClient.bulkDelete.mock.invocationCallOrder[0]
      );
    } finally {
      generateIdSpy.mockRestore();
    }
  });

  it('does not delete previous credentials when create fails', async () => {
    unsecuredSavedObjectsClient.create.mockRejectedValueOnce(new Error('create failed'));

    await expect(
      mintIngressCredential({
        unsecuredSavedObjectsClient,
        connectorId: 'connector-1',
        spaceId: 'default',
        auditLogger,
        logger,
      })
    ).rejects.toThrow('create failed');
    expect(unsecuredSavedObjectsClient.find).not.toHaveBeenCalled();
    expect(unsecuredSavedObjectsClient.bulkDelete).not.toHaveBeenCalled();
  });

  it('throws after create when deleting the previous credential fails', async () => {
    unsecuredSavedObjectsClient.find.mockResolvedValue({
      saved_objects: [previousCredential],
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
      mintIngressCredential({
        unsecuredSavedObjectsClient,
        connectorId: 'connector-1',
        spaceId: 'default',
        auditLogger,
        logger,
      })
    ).rejects.toThrow('Failed to delete 1 ingest credential(s) for connector "connector-1"');
    expect(unsecuredSavedObjectsClient.create).toHaveBeenCalled();
  });
});
