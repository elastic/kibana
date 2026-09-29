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
import { createLogOnce } from './log_once';
import type { CatalogSource } from './types';
import type { ConnectorCatalogStorage } from './catalog_storage';

jest.mock('./catalog_loader', () => ({
  loadCatalogFromIndex: jest.fn().mockResolvedValue({ registered: 0, manifestPresent: true }),
}));
jest.mock('./catalog_refresh', () => ({
  runCatalogRefresh: jest.fn().mockResolvedValue({ outcome: 'failed' }),
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
  const deps = {
    registerType: jest.fn(),
    isTypeRegistered: () => false,
    esClient: {} as never,
    savedObjectsRepository: { find: jest.fn() },
  };

  const createService = () =>
    new DeclarativeCatalogService({
      source,
      publicKeys: ['key'],
      refreshIntervalMs: 10_000,
      logger,
      logOnce: createLogOnce(logger),
      buildType: jest.fn(),
      createStorage: () => storage,
    });

  beforeEach(() => {
    mockedLoad.mockClear();
    mockedRefresh.mockClear();
    loggerMock.clear(logger);
    mockedLoad.mockResolvedValue({ registered: 0, manifestPresent: true });
    mockedRefresh.mockResolvedValue({ outcome: 'failed' });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads from the index at boot and serializes refresh', async () => {
    const service = createService();
    await service.loadAtBoot(deps);
    expect(mockedLoad).toHaveBeenCalled();
    mockedRefresh.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return { outcome: 'failed' };
    });
    const first = service.refresh();
    const second = service.refresh();
    await Promise.all([first, second]);
    expect(mockedRefresh).toHaveBeenCalledTimes(1);
    service.stop();
  });

  it('skips the boot fetch when the manifest is present', async () => {
    const service = createService();
    await service.loadAtBoot(deps, { timeoutMs: 8_000 });
    expect(mockedRefresh).not.toHaveBeenCalled();
    expect(mockedLoad).toHaveBeenCalledTimes(1);
    service.stop();
  });

  it('skips the boot fetch when no bootFetch option is given', async () => {
    mockedLoad.mockResolvedValue({ registered: 0, manifestPresent: false });
    const service = createService();
    await service.loadAtBoot(deps);
    expect(mockedRefresh).not.toHaveBeenCalled();
    service.stop();
  });

  it('fetches the catalog at boot when the index is empty', async () => {
    mockedLoad
      .mockResolvedValueOnce({ registered: 0, manifestPresent: false })
      .mockResolvedValueOnce({ registered: 2, manifestPresent: true });
    mockedRefresh.mockResolvedValue({ outcome: 'replaced' });
    const service = createService();
    await service.loadAtBoot(deps, { timeoutMs: 8_000 });
    expect(mockedRefresh).toHaveBeenCalledTimes(1);
    expect(mockedRefresh).toHaveBeenCalledWith(
      expect.objectContaining({ fetchConcurrency: 20, skipIcons: true })
    );
    expect(mockedLoad).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith(
      'Connector catalog index is empty; fetching the catalog at boot'
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Connector catalog boot fetch finished (replaced); registered 2 catalog types'
    );
    service.stop();
  });

  it('registers types from the second load when another node stored the manifest first', async () => {
    mockedLoad
      .mockResolvedValueOnce({ registered: 0, manifestPresent: false })
      .mockResolvedValueOnce({ registered: 1, manifestPresent: true });
    mockedRefresh.mockResolvedValue({ outcome: 'stale' });
    const service = createService();
    await service.loadAtBoot(deps, { timeoutMs: 8_000 });
    expect(logger.info).toHaveBeenCalledWith(
      'Connector catalog boot fetch finished (stale); registered 1 catalog types'
    );
    service.stop();
  });

  it('resolves loadAtBoot when the boot fetch rejects', async () => {
    mockedLoad.mockResolvedValue({ registered: 0, manifestPresent: false });
    mockedRefresh.mockRejectedValueOnce(new Error('boom'));
    const service = createService();
    await expect(service.loadAtBoot(deps, { timeoutMs: 8_000 })).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Connector catalog boot fetch failed: boom')
    );
    service.stop();
  });

  it('resolves loadAtBoot when the boot fetch exceeds its budget and finishes later', async () => {
    jest.useFakeTimers();
    mockedLoad.mockResolvedValue({ registered: 0, manifestPresent: false });
    let resolveRefresh: (value: { outcome: 'replaced' }) => void;
    mockedRefresh.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      })
    );
    const service = createService();
    const boot = service.loadAtBoot(deps, { timeoutMs: 8_000 });
    await jest.advanceTimersByTimeAsync(8_000);
    await boot;
    expect(logger.warn).toHaveBeenCalledWith(
      'Connector catalog boot fetch exceeded 8000ms; continuing in the background'
    );
    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(mockedRefresh).toHaveBeenCalledTimes(1);
    resolveRefresh!({ outcome: 'replaced' });
    await new Promise<void>((resolve) => {
      jest.requireActual('timers').setImmediate(resolve);
    });
    expect(mockedLoad).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenCalledWith(
      'Connector catalog boot fetch finished (replaced); registered 0 catalog types'
    );
    service.stop();
  });

  it('does not fetch when the index read times out', async () => {
    jest.useFakeTimers();
    mockedLoad.mockReturnValue(new Promise(() => {}));
    const service = createService();
    const boot = service.loadAtBoot(deps, { timeoutMs: 8_000 });
    await jest.advanceTimersByTimeAsync(5_000);
    await boot;
    expect(logger.warn).toHaveBeenCalledWith(
      'Connector catalog load timed out; starting with in-tree types only'
    );
    expect(mockedRefresh).not.toHaveBeenCalled();
    service.stop();
  });
});
