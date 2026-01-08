/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
// @ts-nocheck

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { Subject } from 'rxjs';
import { registerCloudConnectLicenseSync } from './register_license_sync';
import { StorageService } from '../services/storage';
import { CloudConnectClient } from '../services/cloud_connect_client';

jest.mock('@kbn/core/server', () => ({
  SavedObjectsClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../services/storage');
jest.mock('../services/cloud_connect_client');

const flushPromises = async () => await new Promise((resolve) => setImmediate(resolve));

describe('registerCloudConnectLicenseSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not call Cloud Connect when there is no stored api key', async () => {
    const logger = loggingSystemMock.createLogger();

    const license$ = new Subject();
    const licensing = { license$ };

    const esInfo = jest.fn().mockResolvedValue({ version: { number: '8.0.0' } });
    const getApiKey = jest.fn().mockResolvedValue(undefined);
    StorageService.mockImplementation(() => ({ getApiKey }));

    const updateCluster = jest.fn();
    CloudConnectClient.mockImplementation(() => ({ updateCluster }));

    const sub = registerCloudConnectLicenseSync({
      savedObjects: { createInternalRepository: jest.fn(() => ({})) },
      elasticsearchClient: { info: esInfo },
      encryptedSavedObjects: { getClient: jest.fn() },
      licensing,
      logger,
      cloudApiUrl: 'https://cloud.example/api/v1',
    });

    license$.next({ type: 'platinum', uid: 'abc' });
    await flushPromises();

    expect(getApiKey).toHaveBeenCalled();
    expect(esInfo).not.toHaveBeenCalled();
    expect(updateCluster).not.toHaveBeenCalled();
    sub.unsubscribe();
    license$.complete();
  });

  it('syncs license changes to Cloud Connect when api key is present', async () => {
    const logger = loggingSystemMock.createLogger();

    const license$ = new Subject();
    const licensing = { license$ };

    const esInfo = jest.fn().mockResolvedValue({ version: { number: '8.0.0' } });
    const getApiKey = jest.fn().mockResolvedValue({
      apiKey: 'k-123',
      clusterId: 'c-456',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    StorageService.mockImplementation(() => ({ getApiKey }));

    const updateCluster = jest.fn().mockResolvedValue(undefined);
    CloudConnectClient.mockImplementation(() => ({ updateCluster }));

    const sub = registerCloudConnectLicenseSync({
      savedObjects: { createInternalRepository: jest.fn(() => ({})) },
      elasticsearchClient: { info: esInfo },
      encryptedSavedObjects: { getClient: jest.fn() },
      licensing,
      logger,
      cloudApiUrl: 'https://cloud.example/api/v1',
    });

    license$.next({ type: 'basic', uid: 7 });
    await flushPromises();

    expect(updateCluster).toHaveBeenCalledWith('k-123', 'c-456', {
      license: {
        type: 'basic',
        uid: '7',
        version: '8.0.0',
      },
      self_managed_cluster: {
        name: undefined,
        id: undefined,
        version: '8.0.0',
      },
    });
    sub.unsubscribe();
    license$.complete();
  });

  it('logs a warning when sync fails', async () => {
    const logger = loggingSystemMock.createLogger();

    const license$ = new Subject();
    const licensing = { license$ };

    const esInfo = jest.fn().mockResolvedValue({ version: { number: '8.0.0' } });
    const getApiKey = jest.fn().mockResolvedValue({
      apiKey: 'k-123',
      clusterId: 'c-456',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    StorageService.mockImplementation(() => ({ getApiKey }));

    const err = new Error('boom');
    const updateCluster = jest.fn().mockRejectedValue(err);
    CloudConnectClient.mockImplementation(() => ({ updateCluster }));

    const sub = registerCloudConnectLicenseSync({
      savedObjects: { createInternalRepository: jest.fn(() => ({})) },
      elasticsearchClient: { info: esInfo },
      encryptedSavedObjects: { getClient: jest.fn() },
      licensing,
      logger,
      cloudApiUrl: 'https://cloud.example/api/v1',
    });

    license$.next({ type: 'platinum', uid: 'abc' });
    await flushPromises();

    expect(logger.warn).toHaveBeenCalledWith('Failed to sync license to Cloud Connect', {
      error: err,
    });
    sub.unsubscribe();
    license$.complete();
  });
});
