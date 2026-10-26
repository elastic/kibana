/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { CatalogService } from './catalog_service';
import { createLogOnce } from './log_once';
import {
  ABUSEIPDB_1_0_YAML,
  buildTestCatalog,
  createInMemoryCatalogSource,
  createInMemoryStorage,
  createTestSigningKeys,
} from './test_fixtures';

const keys = createTestSigningKeys();
const esClient = {} as ElasticsearchClient;

const built = () =>
  buildTestCatalog({
    rows: [{ id: '.abuseipdb', version: '1.0', yaml: ABUSEIPDB_1_0_YAML }],
    sequence: 1,
    privateKeyPem: keys.privateKeyPem,
  });

describe('CatalogService', () => {
  const logger = loggerMock.create();

  const createService = (
    source: ReturnType<typeof createInMemoryCatalogSource>,
    storage = createInMemoryStorage()
  ) =>
    new CatalogService({
      source,
      publicKeys: [keys.publicKeyPem],
      refreshIntervalMs: 10_000,
      logger,
      logOnce: createLogOnce(logger),
      createStorage: () => storage,
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fetches once at boot when storage has no manifest', async () => {
    const catalog = built();
    const source = createInMemoryCatalogSource(catalog.files);
    const service = createService(source);
    await service.loadAtBoot({ esClient }, { timeoutMs: 1_000 });
    expect(source.reads.filter((path) => path === 'catalog.json')).toHaveLength(1);
    service.stop();
  });

  it('does not fetch when a verified manifest is already stored', async () => {
    const catalog = built();
    const storage = createInMemoryStorage();
    await storage.putManifest(
      {
        bytes: catalog.bytes,
        signature: catalog.signature,
        sequence: 1,
        catalogVersion: catalog.manifest.catalogVersion,
        fetchedAt: '2026-01-01T00:00:00.000Z',
      },
      undefined
    );
    const source = createInMemoryCatalogSource(catalog.files);
    const service = createService(source, storage);
    await service.loadAtBoot({ esClient }, { timeoutMs: 1_000 });
    expect(source.reads).toEqual([]);
    service.stop();
  });

  it('fetches at boot when the stored manifest signature is bad', async () => {
    const catalog = built();
    const storage = createInMemoryStorage();
    await storage.putManifest(
      {
        bytes: catalog.bytes,
        signature: 'bm90LWEtdmFsaWQtc2lnbmF0dXJl',
        sequence: 1,
        catalogVersion: catalog.manifest.catalogVersion,
        fetchedAt: '2026-01-01T00:00:00.000Z',
      },
      undefined
    );
    const source = createInMemoryCatalogSource(catalog.files);
    const service = createService(source, storage);
    await service.loadAtBoot({ esClient }, { timeoutMs: 1_000 });
    expect(source.reads.filter((path) => path === 'catalog.json')).toHaveLength(1);
    service.stop();
  });

  it('resolves when the source throws and logs a warning', async () => {
    const source = createInMemoryCatalogSource(new Map(), { fail: true });
    const service = createService(source);
    await expect(service.loadAtBoot({ esClient }, { timeoutMs: 1_000 })).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalled();
    service.stop();
  });

  it('resolves when the source hangs past the boot fetch timeout', async () => {
    jest.useFakeTimers();
    const source = createInMemoryCatalogSource(new Map(), { hang: true });
    const service = createService(source);
    const boot = service.loadAtBoot({ esClient }, { timeoutMs: 1_000 });
    await jest.advanceTimersByTimeAsync(1_000);
    await expect(boot).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('exceeded 1000ms'));
    service.stop();
  });

  it('shares one promise across concurrent refresh calls', async () => {
    const catalog = built();
    const storage = createInMemoryStorage();
    await storage.putManifest(
      {
        bytes: catalog.bytes,
        signature: catalog.signature,
        sequence: 1,
        catalogVersion: catalog.manifest.catalogVersion,
        fetchedAt: '2026-01-01T00:00:00.000Z',
      },
      undefined
    );
    let release: () => void = () => undefined;
    const source = createInMemoryCatalogSource(catalog.files);
    const original = source.readManifest.bind(source);
    source.readManifest = (signal) =>
      new Promise((resolve, reject) => {
        release = () => {
          original(signal).then(resolve, reject);
        };
      });
    const service = createService(source, storage);
    await service.loadAtBoot({ esClient });
    const first = service.refresh();
    const second = service.refresh();
    release();
    await Promise.all([first, second]);
    expect(source.reads.filter((path) => path === 'catalog.json')).toHaveLength(1);
    service.stop();
  });
});
