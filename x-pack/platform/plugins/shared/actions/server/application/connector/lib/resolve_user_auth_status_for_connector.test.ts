/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { resolveUserAuthStatusForConnector } from './resolve_user_auth_status_for_connector';

jest.mock('../../../data/connector/get_user_token_connectors_so', () => ({
  getUserTokenConnectorsSo: jest.fn(),
}));

import { getUserTokenConnectorsSo } from '../../../data/connector/get_user_token_connectors_so';

const getUserTokenConnectorsSoMock = getUserTokenConnectorsSo as jest.MockedFunction<
  typeof getUserTokenConnectorsSo
>;

describe('resolveUserAuthStatusForConnector', () => {
  const savedObjectsClient = savedObjectsClientMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns not_applicable when authMode is shared', async () => {
    const status = await resolveUserAuthStatusForConnector({
      authMode: 'shared',
      connectorId: 'c1',
      profileUid: 'p1',
      savedObjectsClient,
    });
    expect(status).toBe('not_applicable');
    expect(getUserTokenConnectorsSoMock).not.toHaveBeenCalled();
  });

  it('returns not_connected when authMode is per-user but profileUid is undefined', async () => {
    const status = await resolveUserAuthStatusForConnector({
      authMode: 'per-user',
      connectorId: 'c1',
      profileUid: undefined,
      savedObjectsClient,
    });
    expect(status).toBe('not_connected');
    expect(getUserTokenConnectorsSoMock).not.toHaveBeenCalled();
  });

  it('returns connected when connector id is in user token list', async () => {
    getUserTokenConnectorsSoMock.mockResolvedValueOnce({ connectorIds: ['c1', 'c2'] });
    const status = await resolveUserAuthStatusForConnector({
      authMode: 'per-user',
      connectorId: 'c1',
      profileUid: 'p1',
      savedObjectsClient,
    });
    expect(status).toBe('connected');
    expect(getUserTokenConnectorsSoMock).toHaveBeenCalledWith({
      savedObjectsClient,
      profileUid: 'p1',
    });
  });

  it('returns not_connected when connector id is not in user token list', async () => {
    getUserTokenConnectorsSoMock.mockResolvedValueOnce({ connectorIds: ['c2'] });
    const status = await resolveUserAuthStatusForConnector({
      authMode: 'per-user',
      connectorId: 'c1',
      profileUid: 'p1',
      savedObjectsClient,
    });
    expect(status).toBe('not_connected');
  });
});
