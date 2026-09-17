/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import { CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE } from '../../constants/saved_objects';
import { findIngressCredentialsForConnector } from './find_ingress_credentials';

const credential = (id: string) => ({
  id,
  type: CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE,
  attributes: {
    connectorId: 'connector-1',
    ingestTokenHash: 'a'.repeat(64),
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  references: [],
});

describe('findIngressCredentialsForConnector', () => {
  const unsecuredSavedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pages until collected length matches total', async () => {
    const firstPage = Array.from({ length: 10 }, (_, index) => credential(`cred-${index}`));
    const secondPage = [credential('cred-10'), credential('cred-11')];
    unsecuredSavedObjectsClient.find
      .mockResolvedValueOnce({
        saved_objects: firstPage,
        total: 12,
        page: 1,
        per_page: 10,
      } as never)
      .mockResolvedValueOnce({
        saved_objects: secondPage,
        total: 12,
        page: 2,
        per_page: 10,
      } as never);

    const result = await findIngressCredentialsForConnector({
      unsecuredSavedObjectsClient,
      connectorId: 'connector-1',
    });

    expect(result).toHaveLength(12);
    expect(unsecuredSavedObjectsClient.find).toHaveBeenCalledTimes(2);
    expect(unsecuredSavedObjectsClient.find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        filter: `${CONNECTOR_INGRESS_CREDENTIAL_SAVED_OBJECT_TYPE}.attributes.connectorId:"connector-1"`,
      })
    );
    expect(unsecuredSavedObjectsClient.find).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: 2, perPage: 10 })
    );
  });

  it('throws when total exceeds what find returned', async () => {
    unsecuredSavedObjectsClient.find
      .mockResolvedValueOnce({
        saved_objects: Array.from({ length: 10 }, (_, index) => credential(`cred-${index}`)),
        total: 11,
        page: 1,
        per_page: 10,
      } as never)
      .mockResolvedValueOnce({
        saved_objects: [],
        total: 11,
        page: 2,
        per_page: 10,
      } as never);

    await expect(
      findIngressCredentialsForConnector({
        unsecuredSavedObjectsClient,
        connectorId: 'connector-1',
      })
    ).rejects.toThrow(
      'Found 11 ingest credential(s) for connector "connector-1" but only loaded 10'
    );
  });
});
