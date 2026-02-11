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
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SavedObjectsServiceStart, ElasticsearchClient } from '@kbn/core/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';

jest.mock('@kbn/core/server', () => ({
  SavedObjectsClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../services/storage');
jest.mock('../services/cloud_connect_client');

const flushPromises = async () => await new Promise((resolve) => setImmediate(resolve));

describe('registerCloudConnectLicenseSync', () => {
  const licensing = {
    license$: new Subject(),
  };

  beforeEach(() => {
    licensing.license$ = new Subject();
    jest.clearAllMocks();
  });

  it('does not call Cloud Connect when there is no stored api key', async () => {
    const logger = loggingSystemMock.createLogger();

    const esInfo = jest.fn().mockResolvedValue({ version: { number: '8.0.0' } });
    const getApiKey = jest.fn().mockResolvedValue(undefined);
    (StorageService as jest.Mock).mockImplementation(() => ({ getApiKey }));

    const updateCluster = jest.fn();
    (CloudConnectClient as jest.Mock).mockImplementation(() => ({ updateCluster }));

    const sub = registerCloudConnectLicenseSync({
      savedObjects: {
        createInternalRepository: jest.fn(() => ({})),
      } as unknown as SavedObjectsServiceStart,
      elasticsearchClient: { info: esInfo } as unknown as ElasticsearchClient,
      encryptedSavedObjects: {
        getClient: jest.fn(),
      } as unknown as EncryptedSavedObjectsPluginStart,
      licensing: licensing as unknown as LicensingPluginStart,
      logger,
      cloudApiUrl: 'https://cloud.example/api/v1',
    });

    licensing.license$.next({ type: 'platinum', uid: 'abc' });
    await flushPromises();

    expect(getApiKey).toHaveBeenCalled();
    expect(esInfo).not.toHaveBeenCalled();
    expect(updateCluster).not.toHaveBeenCalled();
    sub.unsubscribe();
    licensing.license$.complete();
  });

  it('syncs license changes to Cloud Connect when api key is present', async () => {
    const logger = loggingSystemMock.createLogger();

    const esInfo = jest.fn().mockResolvedValue({ version: { number: '8.0.0' } });
    const getApiKey = jest.fn().mockResolvedValue({
      apiKey: 'k-123',
      clusterId: 'c-456',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    (StorageService as jest.Mock).mockImplementation(() => ({ getApiKey }));

    const updateCluster = jest.fn().mockResolvedValue(undefined);
    (CloudConnectClient as jest.Mock).mockImplementation(() => ({ updateCluster }));

    const sub = registerCloudConnectLicenseSync({
      savedObjects: {
        createInternalRepository: jest.fn(() => ({})),
      } as unknown as SavedObjectsServiceStart,
      elasticsearchClient: { info: esInfo } as unknown as ElasticsearchClient,
      encryptedSavedObjects: {
        getClient: jest.fn(),
      } as unknown as EncryptedSavedObjectsPluginStart,
      licensing: licensing as unknown as LicensingPluginStart,
      logger,
      cloudApiUrl: 'https://cloud.example/api/v1',
    });

    licensing.license$.next({ type: 'basic', uid: 7 });
    await flushPromises();

    expect(updateCluster).toHaveBeenCalledWith('k-123', 'c-456', {
      license: {
        type: 'basic',
        uid: '7',
      },
      self_managed_cluster: {
        name: undefined,
        id: undefined,
        version: '8.0.0',
      },
    });
    sub.unsubscribe();
    licensing.license$.complete();
  });

  it('logs a warning when sync fails', async () => {
    const logger = loggingSystemMock.createLogger();

    const esInfo = jest.fn().mockResolvedValue({ version: { number: '8.0.0' } });
    const getApiKey = jest.fn().mockResolvedValue({
      apiKey: 'k-123',
      clusterId: 'c-456',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    (StorageService as jest.Mock).mockImplementation(() => ({ getApiKey }));

    const err = new Error('boom');
    const updateCluster = jest.fn().mockRejectedValue(err);
    (CloudConnectClient as jest.Mock).mockImplementation(() => ({ updateCluster }));

    const sub = registerCloudConnectLicenseSync({
      savedObjects: {
        createInternalRepository: jest.fn(() => ({})),
      } as unknown as SavedObjectsServiceStart,
      elasticsearchClient: { info: esInfo } as unknown as ElasticsearchClient,
      encryptedSavedObjects: {
        getClient: jest.fn(),
      } as unknown as EncryptedSavedObjectsPluginStart,
      licensing: licensing as unknown as LicensingPluginStart,
      logger,
      cloudApiUrl: 'https://cloud.example/api/v1',
    });

    licensing.license$.next({ type: 'platinum', uid: 'abc' });
    await flushPromises();

    expect(logger.warn).toHaveBeenCalledWith('Failed to sync license to Cloud Connect', {
      error: err,
    });
    sub.unsubscribe();
    licensing.license$.complete();
  });
});
