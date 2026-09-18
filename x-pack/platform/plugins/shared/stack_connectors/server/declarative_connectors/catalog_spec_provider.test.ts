/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { CatalogActionType } from '@kbn/actions-plugin/server';
import type { ConnectorCatalogStorage, StoredCatalogView } from './catalog_storage';
import type { CatalogSpecProviderDiskSource, VersionedTypeFactory } from './catalog_spec_provider';
import { createCatalogSpecProvider, toKibanaMinor } from './catalog_spec_provider';
import type { ISavedObjectsRepository } from '@kbn/core/server';
import {
  LIVE_ABUSEIPDB_1_0_0_YAML,
  LIVE_ABUSEIPDB_1_1_0_YAML,
  LIVE_ABUSEIPDB_ICON,
} from './test_fixtures';
import { getContentHash } from './icon';
import type { VersionedConnectorType } from './versioned_connector_type';

const KIBANA_MINOR = '9.3';
const esClient = {} as ElasticsearchClient;

const liveAsset = {
  yamlPath: 'abuseipdb.yaml',
  yaml: LIVE_ABUSEIPDB_1_1_0_YAML,
  icon: LIVE_ABUSEIPDB_ICON,
};

const definition = (version: string, yaml: string) => ({
  id: '.abuseipdb',
  version,
  yaml,
  iconSvg: LIVE_ABUSEIPDB_ICON,
  contentHash: getContentHash(yaml),
  addedAt: '2026-09-17T12:00:00.000Z',
});

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
    getDefinitions: jest.fn().mockResolvedValue(new Map()),
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

const pinnedRepository = (buckets: Array<{ key: string; versions: string[] }>) =>
  ({
    find: jest.fn().mockResolvedValue({
      aggregations: {
        types: {
          buckets: buckets.map(({ key, versions }) => ({
            key,
            versions: { buckets: versions.map((version) => ({ key: version })) },
          })),
        },
      },
    }),
  } as unknown as ISavedObjectsRepository);

const buildType: jest.MockedFunction<VersionedTypeFactory> = jest.fn(
  ({ id, versions, activeVersion }) =>
    ({
      id,
      actionType: { id } as CatalogActionType,
      getActiveVersion: () => activeVersion,
      getVersions: () => versions.map((entry) => entry.version).sort(),
      hasVersion: (version: string) => versions.some((entry) => entry.version === version),
      getMaterialized: (version: string) => versions.find((entry) => entry.version === version),
      addVersion: jest.fn(),
      setActiveVersion: jest.fn(),
    } as VersionedConnectorType)
);

const createProvider = (
  storage: jest.Mocked<ConnectorCatalogStorage>,
  overrides: { diskSource?: CatalogSpecProviderDiskSource; onBoot?: jest.Mock } = {}
) =>
  createCatalogSpecProvider({
    logger: loggerMock.create(),
    kibanaMinor: KIBANA_MINOR,
    buildType,
    diskSource: overrides.diskSource ?? createDiskSource(),
    createStorage: () => storage,
    onBoot: overrides.onBoot,
  });

describe('toKibanaMinor', () => {
  it('keeps major.minor from a Kibana version string', () => {
    expect(toKibanaMinor('9.3.0')).toBe('9.3');
    expect(toKibanaMinor('8.19.1-SNAPSHOT')).toBe('8.19');
  });
});

describe('createCatalogSpecProvider', () => {
  beforeEach(() => {
    buildType.mockClear();
  });

  it('seeds an empty index from disk, then materializes from the index', async () => {
    const storage = createStorage({
      getDefinitions: jest
        .fn()
        .mockResolvedValue(
          new Map([['definition:.abuseipdb@1.1.0', definition('1.1.0', LIVE_ABUSEIPDB_1_1_0_YAML)]])
        ),
    });
    const diskSource = createDiskSource();
    const onBoot = jest.fn();
    const provider = createProvider(storage, { diskSource, onBoot });

    const types = await provider.load({
      esClient,
      savedObjectsRepository: pinnedRepository([]),
    });

    expect(types.map((type) => type.id)).toEqual(['.abuseipdb']);
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
        rows: [expect.objectContaining({ version: '1.1.0', status: 'active' })],
      })
    );
    expect(buildType).toHaveBeenCalledWith(
      expect.objectContaining({ id: '.abuseipdb', activeVersion: '1.1.0' })
    );
    expect(onBoot).toHaveBeenCalledWith(
      expect.objectContaining({
        types: [expect.objectContaining({ id: '.abuseipdb' })],
        view: expect.objectContaining({ catalogVersion: 'snapshot:abuseipdb-1.1.0' }),
        pinnedVersionsMissing: [],
        storage,
      })
    );
  });

  it('does not read the disk snapshot when a catalog document already exists', async () => {
    const storage = createStorage({
      getCatalogView: jest.fn().mockResolvedValue({ view: seededView(), seqNo: 1, primaryTerm: 1 }),
      getDefinitions: jest
        .fn()
        .mockResolvedValue(
          new Map([['definition:.abuseipdb@1.1.0', definition('1.1.0', LIVE_ABUSEIPDB_1_1_0_YAML)]])
        ),
    });
    const diskSource = createDiskSource();
    const provider = createProvider(storage, { diskSource });

    const types = await provider.load({ esClient, savedObjectsRepository: pinnedRepository([]) });

    expect(diskSource.loadRawSpecs).not.toHaveBeenCalled();
    expect(diskSource.loadManifest).not.toHaveBeenCalled();
    expect(storage.putDefinitionCreate).not.toHaveBeenCalled();
    expect(storage.getDefinition).not.toHaveBeenCalled();
    expect(storage.getDefinitions).toHaveBeenCalledTimes(1);
    expect(types.map((type) => type.id)).toEqual(['.abuseipdb']);
  });

  it('materializes every pinned version in one bulk read and reports missing pins', async () => {
    const storage = createStorage({
      getCatalogView: jest.fn().mockResolvedValue({ view: seededView(), seqNo: 1, primaryTerm: 1 }),
      getDefinitions: jest.fn().mockResolvedValue(
        new Map([
          ['definition:.abuseipdb@1.1.0', definition('1.1.0', LIVE_ABUSEIPDB_1_1_0_YAML)],
          ['definition:.abuseipdb@1.0.0', definition('1.0.0', LIVE_ABUSEIPDB_1_0_0_YAML)],
        ])
      ),
    });
    const onBoot = jest.fn();
    const provider = createProvider(storage, { onBoot });

    await provider.load({
      esClient,
      savedObjectsRepository: pinnedRepository([
        { key: '.abuseipdb', versions: ['1.0.0', '0.9.0'] },
        { key: '.gone', versions: ['3.0.0'] },
      ]),
    });

    expect(storage.getDefinitions).toHaveBeenCalledWith(
      expect.arrayContaining([
        { id: '.abuseipdb', version: '1.1.0' },
        { id: '.abuseipdb', version: '1.0.0' },
        { id: '.abuseipdb', version: '0.9.0' },
      ])
    );
    expect(buildType).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '.abuseipdb',
        activeVersion: '1.1.0',
        versions: expect.arrayContaining([
          expect.objectContaining({ version: '1.1.0' }),
          expect.objectContaining({ version: '1.0.0' }),
        ]),
      })
    );
    expect(onBoot).toHaveBeenCalledWith(
      expect.objectContaining({
        pinnedVersionsMissing: [
          { id: '.abuseipdb', version: '0.9.0' },
          { id: '.gone', version: '3.0.0' },
        ],
      })
    );
  });

  it('treats legacy rows without a status as active', async () => {
    const storage = createStorage({
      getCatalogView: jest.fn().mockResolvedValue({
        view: seededView({
          rows: [
            {
              id: '.abuseipdb',
              version: '1.0.0',
              contentHash: getContentHash(LIVE_ABUSEIPDB_1_0_0_YAML),
              definitionId: 'definition:.abuseipdb@1.0.0',
            },
            {
              id: '.abuseipdb',
              version: '1.1.0',
              contentHash: getContentHash(LIVE_ABUSEIPDB_1_1_0_YAML),
              definitionId: 'definition:.abuseipdb@1.1.0',
              status: 'published',
            },
          ],
        }),
        seqNo: 1,
        primaryTerm: 1,
      }),
      getDefinitions: jest
        .fn()
        .mockResolvedValue(
          new Map([['definition:.abuseipdb@1.0.0', definition('1.0.0', LIVE_ABUSEIPDB_1_0_0_YAML)]])
        ),
    });

    await createProvider(storage).load({ esClient, savedObjectsRepository: pinnedRepository([]) });

    expect(buildType).toHaveBeenCalledWith(
      expect.objectContaining({ id: '.abuseipdb', activeVersion: '1.0.0' })
    );
  });

  it('skips a catalog row whose definition document is missing', async () => {
    const storage = createStorage({
      getCatalogView: jest.fn().mockResolvedValue({ view: seededView(), seqNo: 1, primaryTerm: 1 }),
    });

    await expect(
      createProvider(storage).load({ esClient, savedObjectsRepository: pinnedRepository([]) })
    ).resolves.toEqual([]);
    expect(buildType).not.toHaveBeenCalled();
  });

  it('skips a catalog row whose definition cannot be materialized', async () => {
    const storage = createStorage({
      getCatalogView: jest.fn().mockResolvedValue({ view: seededView(), seqNo: 1, primaryTerm: 1 }),
      getDefinitions: jest
        .fn()
        .mockResolvedValue(
          new Map([
            [
              'definition:.abuseipdb@1.1.0',
              { ...definition('1.1.0', 'not: valid: yaml: :::'), contentHash: 'sha256:dead' },
            ],
          ])
        ),
    });

    await expect(
      createProvider(storage).load({ esClient, savedObjectsRepository: pinnedRepository([]) })
    ).resolves.toEqual([]);
  });

  it('returns an empty list when the index is empty and the disk snapshot is missing', async () => {
    const storage = createStorage();
    const diskSource = createDiskSource({
      loadRawSpecs: jest.fn().mockRejectedValue(new Error('ENOENT: snapshot missing')),
      loadManifest: jest.fn().mockRejectedValue(new Error('ENOENT: snapshot missing')),
    });

    await expect(
      createProvider(storage, { diskSource }).load({
        esClient,
        savedObjectsRepository: pinnedRepository([]),
      })
    ).resolves.toEqual([]);
    expect(storage.putCatalogView).not.toHaveBeenCalled();
  });

  it('returns an empty list instead of throwing when Elasticsearch fails', async () => {
    const storage = createStorage({
      getCatalogView: jest.fn().mockRejectedValue(new Error('circuit_breaking_exception')),
    });
    const onBoot = jest.fn();

    await expect(
      createProvider(storage, { onBoot }).load({
        esClient,
        savedObjectsRepository: pinnedRepository([]),
      })
    ).resolves.toEqual([]);
    expect(onBoot).toHaveBeenCalledWith({ types: [], pinnedVersionsMissing: [] });
  });
});
