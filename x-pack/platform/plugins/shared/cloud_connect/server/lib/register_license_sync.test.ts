/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { Subject } from 'rxjs';
import { registerCloudConnectLicenseSync } from './register_license_sync';
import { StorageService } from '../services/storage';
import { CloudConnectClient } from '../services/cloud_connect_client';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SavedObjectsServiceStart, ElasticsearchClient } from '@kbn/core/server';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/server';

vi.mock('@kbn/core/server', () => {
      const mocked = {
      SavedObjectsClient: vi.fn().mockImplementation(() => ({})),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../services/storage');
vi.mock('../services/cloud_connect_client');

const flushPromises = async () => await new Promise((resolve) => setImmediate(resolve));

describe('registerCloudConnectLicenseSync', () => {
  const licensing = {
    license$: new Subject(),
  };

  beforeEach(() => {
    licensing.license$ = new Subject();
    vi.clearAllMocks();
  });

  it('does not call Cloud Connect when there is no stored api key', async () => {
    const logger = loggingSystemMock.createLogger();

    const esInfo = vi.fn().mockResolvedValue({ version: { number: '8.0.0' } });
    const getApiKey = vi.fn().mockResolvedValue(undefined);
    (StorageService as Mock).mockImplementation(() => ({ getApiKey }));

    const updateCluster = vi.fn();
    (CloudConnectClient as Mock).mockImplementation(() => ({ updateCluster }));

    const sub = registerCloudConnectLicenseSync({
      savedObjects: {
        createInternalRepository: vi.fn(() => ({})),
      } as unknown as SavedObjectsServiceStart,
      elasticsearchClient: { info: esInfo } as unknown as ElasticsearchClient,
      encryptedSavedObjects: {
        getClient: vi.fn(),
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

    const esInfo = vi.fn().mockResolvedValue({ version: { number: '8.0.0' } });
    const getApiKey = vi.fn().mockResolvedValue({
      apiKey: 'k-123',
      clusterId: 'c-456',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    (StorageService as Mock).mockImplementation(() => ({ getApiKey }));

    const updateCluster = vi.fn().mockResolvedValue(undefined);
    (CloudConnectClient as Mock).mockImplementation(() => ({ updateCluster }));

    const sub = registerCloudConnectLicenseSync({
      savedObjects: {
        createInternalRepository: vi.fn(() => ({})),
      } as unknown as SavedObjectsServiceStart,
      elasticsearchClient: { info: esInfo } as unknown as ElasticsearchClient,
      encryptedSavedObjects: {
        getClient: vi.fn(),
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

    const esInfo = vi.fn().mockResolvedValue({ version: { number: '8.0.0' } });
    const getApiKey = vi.fn().mockResolvedValue({
      apiKey: 'k-123',
      clusterId: 'c-456',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    (StorageService as Mock).mockImplementation(() => ({ getApiKey }));

    const err = new Error('boom');
    const updateCluster = vi.fn().mockRejectedValue(err);
    (CloudConnectClient as Mock).mockImplementation(() => ({ updateCluster }));

    const sub = registerCloudConnectLicenseSync({
      savedObjects: {
        createInternalRepository: vi.fn(() => ({})),
      } as unknown as SavedObjectsServiceStart,
      elasticsearchClient: { info: esInfo } as unknown as ElasticsearchClient,
      encryptedSavedObjects: {
        getClient: vi.fn(),
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
