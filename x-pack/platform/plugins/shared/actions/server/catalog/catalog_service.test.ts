/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { DeclarativeCatalogService } from './catalog_service';
import { loadCatalogFromIndex } from './catalog_loader';
import { runCatalogRefresh } from './catalog_refresh';
import type { CatalogSource } from './types';
import type { ConnectorCatalogStorage } from './catalog_storage';

jest.mock('./catalog_loader', () => ({
  loadCatalogFromIndex: jest.fn().mockResolvedValue({ registered: 0 }),
}));
jest.mock('./catalog_refresh', () => ({
  runCatalogRefresh: jest.fn().mockResolvedValue(undefined),
}));

const mockedLoad = loadCatalogFromIndex as jest.MockedFunction<typeof loadCatalogFromIndex>;
const mockedRefresh = runCatalogRefresh as jest.MockedFunction<typeof runCatalogRefresh>;

describe('DeclarativeCatalogService', () => {
  const logger = loggerMock.create();
  const source: CatalogSource = {
    origin: 'http://127.0.0.1:8090',
    readManifest: async () => ({ bytes: '{}', signature: 'sig' }),
    readText: async () => '',
  };
  const storage = {} as ConnectorCatalogStorage;

  const createService = () =>
    new DeclarativeCatalogService({
      source,
      publicKeys: ['key'],
      refreshIntervalMs: 10_000,
      logger,
      buildType: jest.fn(),
      createStorage: () => storage,
    });

  it('loads from the index at boot and serializes refresh', async () => {
    const service = createService();
    await service.loadAtBoot({
      registerType: jest.fn(),
      isTypeRegistered: () => false,
      esClient: {} as never,
      savedObjectsRepository: { find: jest.fn() },
    });
    expect(mockedLoad).toHaveBeenCalled();
    mockedRefresh.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    const first = service.refresh();
    const second = service.refresh();
    await Promise.all([first, second]);
    expect(mockedRefresh).toHaveBeenCalledTimes(1);
    service.stop();
  });
});
