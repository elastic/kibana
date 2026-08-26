/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeBuilder } from '@kbn/es-query';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { getUserTokenConnectorsSo } from './get_user_token_connectors_so';
import { USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE } from '../../constants/saved_objects';

const savedObjectsClient = savedObjectsClientMock.create();

beforeEach(() => {
  jest.resetAllMocks();
});

describe('getUserTokenConnectorsSo', () => {
  it('calls find with a KueryNode filter scoped to the given profileUid', async () => {
    savedObjectsClient.find.mockResolvedValueOnce({
      total: 0,
      per_page: 10000,
      page: 1,
      saved_objects: [],
    });

    await getUserTokenConnectorsSo({ savedObjectsClient, profileUid: 'test-profile-uid' });

    expect(savedObjectsClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        type: USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
        perPage: 10000,
        fields: ['connectorId'],
        filter: nodeBuilder.is(
          `${USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE}.attributes.profileUid`,
          'test-profile-uid'
        ),
      })
    );
  });

  it('returns connectorIds extracted from the saved objects', async () => {
    savedObjectsClient.find.mockResolvedValueOnce({
      total: 2,
      per_page: 10000,
      page: 1,
      saved_objects: [
        {
          id: 'token-1',
          type: USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
          attributes: {
            profileUid: 'test-profile-uid',
            connectorId: 'connector-a',
            credentialType: 'oauth',
            credentials: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          score: 1,
          references: [],
        },
        {
          id: 'token-2',
          type: USER_CONNECTOR_TOKEN_SAVED_OBJECT_TYPE,
          attributes: {
            profileUid: 'test-profile-uid',
            connectorId: 'connector-b',
            credentialType: 'oauth',
            credentials: {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          score: 1,
          references: [],
        },
      ],
    });

    const result = await getUserTokenConnectorsSo({
      savedObjectsClient,
      profileUid: 'test-profile-uid',
    });

    expect(result).toEqual({ connectorIds: ['connector-a', 'connector-b'] });
  });

  it('returns an empty connectorIds array when no tokens exist for the profileUid', async () => {
    savedObjectsClient.find.mockResolvedValueOnce({
      total: 0,
      per_page: 10000,
      page: 1,
      saved_objects: [],
    });

    const result = await getUserTokenConnectorsSo({
      savedObjectsClient,
      profileUid: 'unknown-profile',
    });

    expect(result).toEqual({ connectorIds: [] });
  });
});
