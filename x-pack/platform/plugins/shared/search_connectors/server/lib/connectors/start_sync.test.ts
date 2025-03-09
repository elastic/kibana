/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import { SyncJobType } from '@kbn/search-connectors';

import { fetchConnectorById, startConnectorSync } from '@kbn/search-connectors';

import { ErrorCode } from '../../../common/types/error_codes';

import { startSync } from './start_sync';

jest.mock('@kbn/search-connectors', () => {
  const originalModule = jest.requireActual('@kbn/search-connectors');
  return {
    ...originalModule,
    fetchConnectorById: jest.fn(),
    startConnectorSync: jest.fn(),
  };
});

describe('startSync lib function', () => {
  const mockClient = {
    asCurrentUser: {
      get: jest.fn(),
      index: jest.fn(),
      update: jest.fn(),
    },
    asInternalUser: {},
    transport: {
      request: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should start a full sync', async () => {
    (fetchConnectorById as jest.Mock).mockResolvedValue({
      api_key_id: null,
      configuration: {},
      created_at: null,
      custom_scheduling: {},
      error: null,
      id: 'connectorId',
      index_name: 'index_name',
      language: null,
      last_access_control_sync_error: null,
      last_access_control_sync_scheduled_at: null,
      last_access_control_sync_status: null,
      last_seen: null,
      last_sync_error: null,
      last_sync_scheduled_at: null,
      last_sync_status: null,
      last_synced: null,
      scheduling: { enabled: true, interval: '1 2 3 4 5' },
      service_type: null,
      status: 'not connected',
      sync_now: false,
    });

    (startConnectorSync as jest.Mock).mockResolvedValue({ id: 'fakeId' });

    await expect(
      startSync(mockClient as unknown as IScopedClusterClient, 'connectorId', SyncJobType.FULL)
    ).resolves.toEqual({ id: 'fakeId' });

    expect(startConnectorSync).toHaveBeenCalledWith(mockClient.asCurrentUser, {
      connectorId: 'connectorId',
      jobType: 'full',
    });
  });

  it('should not create job if there is no connector', async () => {
    (fetchConnectorById as jest.Mock).mockResolvedValue(undefined);
    await expect(
      startSync(mockClient as unknown as IScopedClusterClient, 'connectorId', SyncJobType.FULL)
    ).rejects.toEqual(new Error(ErrorCode.RESOURCE_NOT_FOUND));
    expect(startConnectorSync).not.toHaveBeenCalled();
  });

  it('should start an incremental sync', async () => {
    (fetchConnectorById as jest.Mock).mockResolvedValue({
      api_key_id: null,
      configuration: {},
      created_at: null,
      custom_scheduling: {},
      error: null,
      id: 'connectorId',
      index_name: 'index_name',
      language: null,
      last_access_control_sync_error: null,
      last_access_control_sync_scheduled_at: null,
      last_access_control_sync_status: null,
      last_seen: null,
      last_sync_error: null,
      last_sync_scheduled_at: null,
      last_sync_status: null,
      last_synced: null,
      scheduling: { enabled: true, interval: '1 2 3 4 5' },
      service_type: null,
      status: 'not connected',
      sync_now: false,
    });

    (startConnectorSync as jest.Mock).mockResolvedValue({ id: 'fakeId' });

    await expect(
      startSync(
        mockClient as unknown as IScopedClusterClient,
        'connectorId',
        SyncJobType.INCREMENTAL
      )
    ).resolves.toEqual({ id: 'fakeId' });

    expect(startConnectorSync).toHaveBeenCalledWith(mockClient.asCurrentUser, {
      connectorId: 'connectorId',
      jobType: 'incremental',
    });
  });

  it('should start an access control sync', async () => {
    (fetchConnectorById as jest.Mock).mockResolvedValue({
      api_key_id: null,
      configuration: {
        use_document_level_security: {
          value: true,
        },
      },
      created_at: null,
      custom_scheduling: {},
      error: null,
      id: 'connectorId',
      index_name: 'index_name',
      language: null,
      last_access_control_sync_error: null,
      last_access_control_sync_scheduled_at: null,
      last_access_control_sync_status: null,
      last_seen: null,
      last_sync_error: null,
      last_sync_scheduled_at: null,
      last_sync_status: null,
      last_synced: null,
      scheduling: { enabled: true, interval: '1 2 3 4 5' },
      service_type: null,
      status: 'not connected',
      sync_now: false,
    });

    (startConnectorSync as jest.Mock).mockResolvedValue({ id: 'fakeId' });

    await expect(
      startSync(
        mockClient as unknown as IScopedClusterClient,
        'connectorId',
        SyncJobType.ACCESS_CONTROL
      )
    ).resolves.toEqual({ id: 'fakeId' });

    expect(startConnectorSync).toHaveBeenCalledWith(mockClient.asCurrentUser, {
      connectorId: 'connectorId',
      jobType: 'access_control',
    });
  });
});
