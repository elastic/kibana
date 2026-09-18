/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { ConnectorCatalogStorage, StoredCatalogView } from './catalog_storage';
import { createCatalogSpecProvider, toKibanaMinor } from './catalog_spec_provider';
import type { CatalogSpecProviderDiskSource } from './catalog_spec_provider';
import { LIVE_ABUSEIPDB_1_1_0_YAML, LIVE_ABUSEIPDB_ICON } from './test_fixtures';
import { getContentHash } from './icon';

const KIBANA_MINOR = '9.3';
const esClient = {} as ElasticsearchClient;

const liveAsset = {
  yamlPath: 'abuseipdb.yaml',
  yaml: LIVE_ABUSEIPDB_1_1_0_YAML,
  icon: LIVE_ABUSEIPDB_ICON,
};

const seededView = (overrides: Partial<StoredCatalogView> = {}): StoredCatalogView => ({
  catalogVersion: 'snapshot:abuseipdb-1.1.0',
  fetchedAt: '2026-09-17T12:00:00.000Z',
  kibanaMinor: KIBANA_MINOR,
  rows: [
    {
      id: '.abuseipdb',
      version: '1.1.0',
      contentHash: getContentHash(LIVE_ABUSEIPDB_1_1_0_YAML),
      definitionId: 'definition:.abuseipdb@1.1.0',
    },
  ],
  ...overrides,
});

const createStorage = (
  overrides: Partial<jest.Mocked<ConnectorCatalogStorage>> = {}
): jest.Mocked<ConnectorCatalogStorage> =>
  ({
    getCatalogView: jest.fn().mockResolvedValue(undefined),
    getDefinition: jest.fn().mockResolvedValue(undefined),
    putDefinitionCreate: jest.fn().mockResolvedValue('created'),
    putCatalogView: jest.fn().mockResolvedValue(undefined),
    putCatalogViewCas: jest.fn().mockResolvedValue('updated'),
    ...overrides,
  } as unknown as jest.Mocked<ConnectorCatalogStorage>);

const createDiskSource = (
  overrides: Partial<CatalogSpecProviderDiskSource> = {}
): CatalogSpecProviderDiskSource => ({
  loadRawSpecs: jest.fn().mockResolvedValue([liveAsset]),
  loadManifest: jest.fn().mockResolvedValue({
    schemaVersion: 1,
    catalogVersion: 'snapshot:abuseipdb-1.1.0',
    activeVersions: { '.abuseipdb': '1.1.0' },
    connectors: [
      {
        id: '.abuseipdb',
        version: '1.1.0',
        definitionUrl: 'abuseipdb.yaml',
        contentHash: getContentHash(LIVE_ABUSEIPDB_1_1_0_YAML),
      },
    ],
  }),
  ...overrides,
});

describe('toKibanaMinor', () => {
  it('keeps major.minor from a Kibana version string', () => {
    expect(toKibanaMinor('9.3.0')).toBe('9.3');
    expect(toKibanaMinor('8.19.1-SNAPSHOT')).toBe('8.19');
  });
});

describe('createCatalogSpecProvider', () => {
  it('seeds an empty index from disk and returns .abuseipdb', async () => {
    const storage = createStorage();
    const diskSource = createDiskSource();
    const onBoot = jest.fn();
    const provider = createCatalogSpecProvider({
      logger: loggerMock.create(),
      kibanaMinor: KIBANA_MINOR,
      diskSource,
      createStorage: () => storage,
      onBoot,
    });

    const specs = await provider.load({ esClient });

    expect(specs.map((spec) => spec.metadata.id)).toEqual(['.abuseipdb']);
    expect(storage.putDefinitionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '.abuseipdb',
        version: '1.1.0',
        yaml: LIVE_ABUSEIPDB_1_1_0_YAML,
      })
    );
    expect(storage.putCatalogView).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogVersion: 'snapshot:abuseipdb-1.1.0',
        kibanaMinor: KIBANA_MINOR,
      })
    );
    expect(onBoot).toHaveBeenCalledWith(
      expect.objectContaining({
        specs,
        view: expect.objectContaining({ catalogVersion: 'snapshot:abuseipdb-1.1.0' }),
      })
    );
  });

  it('does not read the disk snapshot when a catalog document already exists', async () => {
    const storage = createStorage({
      getCatalogView: jest.fn().mockResolvedValue({ view: seededView(), seqNo: 1, primaryTerm: 1 }),
      getDefinition: jest.fn().mockResolvedValue({
        id: '.abuseipdb',
        version: '1.1.0',
        yaml: LIVE_ABUSEIPDB_1_1_0_YAML,
        iconSvg: LIVE_ABUSEIPDB_ICON,
        contentHash: getContentHash(LIVE_ABUSEIPDB_1_1_0_YAML),
        addedAt: '2026-09-17T12:00:00.000Z',
      }),
    });
    const diskSource = createDiskSource();
    const provider = createCatalogSpecProvider({
      logger: loggerMock.create(),
      kibanaMinor: KIBANA_MINOR,
      diskSource,
      createStorage: () => storage,
    });

    const specs = await provider.load({ esClient });

    expect(diskSource.loadRawSpecs).not.toHaveBeenCalled();
    expect(diskSource.loadManifest).not.toHaveBeenCalled();
    expect(storage.putDefinitionCreate).not.toHaveBeenCalled();
    expect(specs.map((spec) => spec.metadata.id)).toEqual(['.abuseipdb']);
  });

  it('skips a catalog row whose definition document is missing', async () => {
    const storage = createStorage({
      getCatalogView: jest.fn().mockResolvedValue({ view: seededView(), seqNo: 1, primaryTerm: 1 }),
      getDefinition: jest.fn().mockResolvedValue(undefined),
    });
    const provider = createCatalogSpecProvider({
      logger: loggerMock.create(),
      kibanaMinor: KIBANA_MINOR,
      diskSource: createDiskSource(),
      createStorage: () => storage,
    });

    await expect(provider.load({ esClient })).resolves.toEqual([]);
  });

  it('skips a catalog row whose definition cannot be materialized', async () => {
    const storage = createStorage({
      getCatalogView: jest.fn().mockResolvedValue({ view: seededView(), seqNo: 1, primaryTerm: 1 }),
      getDefinition: jest.fn().mockResolvedValue({
        id: '.abuseipdb',
        version: '1.1.0',
        yaml: 'not: valid: yaml: :::',
        contentHash: 'sha256:dead',
        addedAt: '2026-09-17T12:00:00.000Z',
      }),
    });
    const provider = createCatalogSpecProvider({
      logger: loggerMock.create(),
      kibanaMinor: KIBANA_MINOR,
      diskSource: createDiskSource(),
      createStorage: () => storage,
    });

    await expect(provider.load({ esClient })).resolves.toEqual([]);
  });

  it('returns an empty list when the index is empty and the disk snapshot is missing', async () => {
    const storage = createStorage();
    const diskSource = createDiskSource({
      loadRawSpecs: jest.fn().mockRejectedValue(new Error('ENOENT: snapshot missing')),
      loadManifest: jest.fn().mockRejectedValue(new Error('ENOENT: snapshot missing')),
    });
    const provider = createCatalogSpecProvider({
      logger: loggerMock.create(),
      kibanaMinor: KIBANA_MINOR,
      diskSource,
      createStorage: () => storage,
    });

    await expect(provider.load({ esClient })).resolves.toEqual([]);
    expect(storage.putCatalogView).not.toHaveBeenCalled();
  });

  it('returns an empty list instead of throwing when Elasticsearch fails', async () => {
    const storage = createStorage({
      getCatalogView: jest.fn().mockRejectedValue(new Error('circuit_breaking_exception')),
    });
    const provider = createCatalogSpecProvider({
      logger: loggerMock.create(),
      kibanaMinor: KIBANA_MINOR,
      diskSource: createDiskSource(),
      createStorage: () => storage,
    });

    await expect(provider.load({ esClient })).resolves.toEqual([]);
  });
});
