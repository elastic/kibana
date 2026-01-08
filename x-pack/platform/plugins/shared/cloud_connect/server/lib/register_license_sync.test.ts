/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

const flushPromises = async () => await new Promise<void>((resolve) => setImmediate(resolve));

describe('registerCloudConnectLicenseSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not call Cloud Connect when there is no stored api key', async () => {
    const logger = loggingSystemMock.createLogger();

    const license$ = new Subject<any>();
    const licensing = { license$ } as any;

    const getApiKey = jest.fn().mockResolvedValue(undefined);
    (StorageService as jest.MockedClass<typeof StorageService>).mockImplementation(
      () => ({ getApiKey } as any)
    );

    const updateClusterLicense = jest.fn();
    (CloudConnectClient as jest.MockedClass<typeof CloudConnectClient>).mockImplementation(
      () => ({ updateClusterLicense } as any)
    );

    const sub = registerCloudConnectLicenseSync({
      savedObjects: { createInternalRepository: jest.fn(() => ({})) } as any,
      encryptedSavedObjects: { getClient: jest.fn() } as any,
      licensing,
      logger,
      cloudApiUrl: 'https://cloud.example/api/v1',
    });

    license$.next({ type: 'platinum', uid: 'abc' });
    await flushPromises();

    expect(getApiKey).toHaveBeenCalled();
    expect(updateClusterLicense).not.toHaveBeenCalled();
    sub.unsubscribe();
  });

  it('syncs license changes to Cloud Connect when api key is present', async () => {
    const logger = loggingSystemMock.createLogger();

    const license$ = new Subject<any>();
    const licensing = { license$ } as any;

    const getApiKey = jest.fn().mockResolvedValue({
      apiKey: 'k-123',
      clusterId: 'c-456',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    (StorageService as jest.MockedClass<typeof StorageService>).mockImplementation(
      () => ({ getApiKey } as any)
    );

    const updateClusterLicense = jest.fn().mockResolvedValue(undefined);
    (CloudConnectClient as jest.MockedClass<typeof CloudConnectClient>).mockImplementation(
      () => ({ updateClusterLicense } as any)
    );

    const sub = registerCloudConnectLicenseSync({
      savedObjects: { createInternalRepository: jest.fn(() => ({})) } as any,
      encryptedSavedObjects: { getClient: jest.fn() } as any,
      licensing,
      logger,
      cloudApiUrl: 'https://cloud.example/api/v1',
    });

    license$.next({ type: 'basic', uid: 7 });
    await flushPromises();

    expect(updateClusterLicense).toHaveBeenCalledWith('k-123', 'c-456', {
      type: 'basic',
      uid: '7',
    });
    sub.unsubscribe();
  });

  it('logs a warning when sync fails', async () => {
    const logger = loggingSystemMock.createLogger();

    const license$ = new Subject<any>();
    const licensing = { license$ } as any;

    const getApiKey = jest.fn().mockResolvedValue({
      apiKey: 'k-123',
      clusterId: 'c-456',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    (StorageService as jest.MockedClass<typeof StorageService>).mockImplementation(
      () => ({ getApiKey } as any)
    );

    const err = new Error('boom');
    const updateClusterLicense = jest.fn().mockRejectedValue(err);
    (CloudConnectClient as jest.MockedClass<typeof CloudConnectClient>).mockImplementation(
      () => ({ updateClusterLicense } as any)
    );

    const sub = registerCloudConnectLicenseSync({
      savedObjects: { createInternalRepository: jest.fn(() => ({})) } as any,
      encryptedSavedObjects: { getClient: jest.fn() } as any,
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
  });
});
