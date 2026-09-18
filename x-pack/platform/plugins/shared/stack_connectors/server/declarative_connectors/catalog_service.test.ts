/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { CatalogActionType } from '@kbn/actions-plugin/server';
import type {
  CatalogSnapshot,
  CatalogSnapshotAsset,
  CatalogSpecSource,
} from './catalog_spec_source';
import type { DeclarativeCatalogRegistrationDeps } from './catalog_service';
import { DeclarativeCatalogService, indexPollIntervalMs } from './catalog_service';
import type { VersionedTypeFactory } from './catalog_spec_provider';
import type { ConnectorCatalogStorage, StoredCatalogView } from './catalog_storage';
import type { MaterializedSpec } from './load_declarative_specs';
import { materializeDeclarativeAsset } from './load_declarative_specs';
import {
  ABUSE_IPDB_SPEC_FIXTURE,
  CONNECTOR_ICON_FIXTURE,
  LIVE_ABUSEIPDB_1_0_0_YAML,
  LIVE_ABUSEIPDB_1_1_0_YAML,
  LIVE_ABUSEIPDB_ICON,
} from './test_fixtures';
import { getContentHash } from './icon';
import type { PinnedVersionsClient } from './pinned_versions';
import type { VersionedConnectorType } from './versioned_connector_type';

const REGISTRY_URL = 'http://127.0.0.1:8089';
const KIBANA_MINOR = '9.3';
const esClient = {} as ElasticsearchClient;
const CATALOG_VERSION = 'sha256:72f5f754750fbdc435db7567e208a1ebffebe4dff5633f401457fea29d2e8e95';

const asset = (
  yaml: string,
  icon: string | undefined,
  overrides: Partial<CatalogSnapshotAsset> = {}
): CatalogSnapshotAsset => {
  const materialized = materializeDeclarativeAsset({ yamlPath: 'x.yaml', yaml, icon });
  return {
    id: materialized.id,
    version: materialized.version,
    contentHash: materialized.contentHash,
    yamlPath: `${REGISTRY_URL}/connectors/${materialized.id.slice(1)}/${materialized.version}.yaml`,
    yaml,
    icon,
    ...overrides,
  };
};

const ABUSEIPDB_1_0_0 = asset(LIVE_ABUSEIPDB_1_0_0_YAML, LIVE_ABUSEIPDB_ICON);
const ABUSEIPDB_1_1_0 = asset(LIVE_ABUSEIPDB_1_1_0_YAML, LIVE_ABUSEIPDB_ICON);
const OTHER_1_0_0 = asset(
  ABUSE_IPDB_SPEC_FIXTURE.replace('id: .abuseipdb', 'id: .otheripdb'),
  CONNECTOR_ICON_FIXTURE
);
/** 2.0.0 removes `baseUrl`, which breaks the additive-only rule. */
const ABUSEIPDB_2_0_0_BREAKING = asset(
  LIVE_ABUSEIPDB_1_1_0_YAML.replace('version: 1.1.0', 'version: 2.0.0')
    .replace(/required:\n    - baseUrl\n/, 'required: []\n')
    .replace(/  properties:\n    baseUrl:[\s\S]*?\n(auth:)/, '  properties: {}\n$1'),
  LIVE_ABUSEIPDB_ICON
);

const snapshot = (overrides: Partial<CatalogSnapshot> = {}): CatalogSnapshot => ({
  catalogVersion: CATALOG_VERSION,
  activeVersions: { '.abuseipdb': '1.1.0' },
  versions: [
    { id: '.abuseipdb', version: '1.1.0', status: 'active' },
    { id: '.abuseipdb', version: '1.0.0', status: 'published' },
  ],
  assets: [ABUSEIPDB_1_1_0, ABUSEIPDB_1_0_0],
  skipped: [],
  ...overrides,
});

const createSource = (loadSnapshot: jest.Mock): CatalogSpecSource =>
  ({ loadSnapshot } as unknown as CatalogSpecSource);

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

/** In-memory stand-in for `createVersionedConnectorType`. */
const fakeBuildType: VersionedTypeFactory = ({ id, versions, activeVersion }) => {
  const entries = new Map(versions.map((entry) => [entry.version, entry]));
  let active = activeVersion;
  const type: VersionedConnectorType = {
    id,
    actionType: { id } as CatalogActionType,
    addVersion: (materialized: MaterializedSpec) => {
      entries.set(materialized.version, materialized);
    },
    setActiveVersion: (version) => {
      active = version;
    },
    getActiveVersion: () => active,
    getVersions: () => [...entries.keys()].sort(),
    hasVersion: (version) => entries.has(version),
    getMaterialized: (version) => entries.get(version),
  };
  return type;
};

const createDeps = (
  overrides: Partial<DeclarativeCatalogRegistrationDeps> = {}
): DeclarativeCatalogRegistrationDeps => ({
  registerType: jest.fn(),
  isTypeRegistered: jest.fn().mockReturnValue(false),
  esClient,
  ...overrides,
});

const createService = (
  source: CatalogSpecSource,
  storage: jest.Mocked<ConnectorCatalogStorage> = createStorage(),
  buildType: VersionedTypeFactory = jest.fn(fakeBuildType)
) =>
  new DeclarativeCatalogService({
    source,
    registryUrl: REGISTRY_URL,
    refreshIntervalMs: 60_000,
    kibanaMinor: KIBANA_MINOR,
    logger: loggerMock.create(),
    buildType,
    createStorage: () => storage,
  });

const storedView = (
  rows: Array<{
    id: string;
    version: string;
    contentHash: string;
    status?: 'active' | 'published';
  }>,
  catalogVersion = 'snapshot:previous'
): StoredCatalogView => ({
  catalogVersion,
  fetchedAt: '2026-09-17T12:00:00.000Z',
  kibanaMinor: KIBANA_MINOR,
  rows: rows.map((row) => ({ ...row, definitionId: `definition:${row.id}@${row.version}` })),
});

describe('indexPollIntervalMs', () => {
  it('is five refresh intervals with a five minute floor', () => {
    expect(indexPollIntervalMs(60_000)).toBe(300_000);
    expect(indexPollIntervalMs(120_000)).toBe(600_000);
  });
});

describe('DeclarativeCatalogService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('registers a new id from its active version and stores every listed version', async () => {
    const registerType = jest.fn();
    const storage = createStorage();
    const service = createService(createSource(jest.fn().mockResolvedValue(snapshot())), storage);

    await service.start(createDeps({ registerType }));
    await service.refreshFromRegistry();
    service.stop();

    expect(registerType).toHaveBeenCalledTimes(1);
    expect(registerType.mock.calls[0][0].id).toBe('.abuseipdb');
    expect(storage.putDefinitionCreate).toHaveBeenCalledTimes(2);
    expect(storage.putDefinitionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ id: '.abuseipdb', version: '1.0.0' })
    );
    expect(storage.putCatalogView).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogVersion: CATALOG_VERSION,
        rows: [
          expect.objectContaining({ version: '1.1.0', status: 'active' }),
          expect.objectContaining({ version: '1.0.0', status: 'published' }),
        ],
      })
    );
    expect(service.getHealth()).toEqual(
      expect.objectContaining({
        ready: true,
        registeredTypeIds: ['.abuseipdb'],
        registeredVersionsByType: { '.abuseipdb': { activeVersion: '1.1.0', versions: ['1.1.0'] } },
        incompatibleVersions: [],
        skipped: [],
        indexReady: true,
        indexCatalogVersion: CATALOG_VERSION,
      })
    );
  });

  it('passes stored hashes to the source so unchanged definitions are not refetched', async () => {
    const hash = getContentHash(LIVE_ABUSEIPDB_1_1_0_YAML);
    const storage = createStorage({
      getCatalogView: jest.fn().mockResolvedValue({
        view: storedView([{ id: '.abuseipdb', version: '1.1.0', contentHash: hash }]),
        seqNo: 1,
        primaryTerm: 1,
      }),
      getDefinition: jest.fn().mockResolvedValue({
        id: '.abuseipdb',
        version: '1.1.0',
        yaml: LIVE_ABUSEIPDB_1_1_0_YAML,
        iconSvg: LIVE_ABUSEIPDB_ICON,
        contentHash: hash,
        addedAt: '2026-09-17T12:00:00.000Z',
      }),
    });
    const loadSnapshot = jest
      .fn()
      .mockResolvedValue(snapshot({ assets: [ABUSEIPDB_1_0_0], versions: snapshot().versions }));
    const registerType = jest.fn();
    const service = createService(createSource(loadSnapshot), storage);

    await service.start(createDeps({ registerType }));
    await service.refreshFromRegistry();
    service.stop();

    expect(loadSnapshot).toHaveBeenCalledWith({
      storedHashes: new Map([['.abuseipdb@1.1.0', hash]]),
    });
    // The active version was not refetched; it is materialized from the index instead.
    expect(storage.getDefinition).toHaveBeenCalledWith('.abuseipdb', '1.1.0');
    expect(registerType).toHaveBeenCalledTimes(1);
    expect(storage.putDefinitionCreate).toHaveBeenCalledTimes(1);
    expect(storage.putDefinitionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ version: '1.0.0' })
    );
  });

  it('adds a new active version to a registered id and keeps the old one materialized', async () => {
    const buildType = jest.fn(fakeBuildType);
    const loadSnapshot = jest
      .fn()
      .mockResolvedValueOnce(
        snapshot({
          activeVersions: { '.abuseipdb': '1.0.0' },
          versions: [{ id: '.abuseipdb', version: '1.0.0', status: 'active' }],
          assets: [ABUSEIPDB_1_0_0],
        })
      )
      .mockResolvedValueOnce(snapshot());
    const registerType = jest.fn();
    const service = createService(createSource(loadSnapshot), createStorage(), buildType);

    await service.start(createDeps({ registerType }));
    await service.refreshFromRegistry();
    expect(service.getHealth().registeredVersionsByType['.abuseipdb']).toEqual({
      activeVersion: '1.0.0',
      versions: ['1.0.0'],
    });

    await service.refreshFromRegistry();
    service.stop();

    expect(registerType).toHaveBeenCalledTimes(1);
    expect(buildType).toHaveBeenCalledTimes(1);
    expect(service.getHealth().registeredVersionsByType['.abuseipdb']).toEqual({
      activeVersion: '1.1.0',
      versions: ['1.0.0', '1.1.0'],
    });
    expect(service.getHealth().skipped).toEqual([]);
  });

  it('stores a non-additive version but keeps the previous version active', async () => {
    let current: { view: StoredCatalogView; seqNo: number; primaryTerm: number } | undefined;
    const writes: StoredCatalogView[] = [];
    const storage = createStorage({
      getCatalogView: jest.fn(async (_kibanaMinor: string) => current),
      putCatalogView: jest.fn(async (view: StoredCatalogView) => {
        writes.push(view);
        current = { view, seqNo: writes.length, primaryTerm: 1 };
      }),
      putCatalogViewCas: jest.fn(
        async (view: StoredCatalogView, _seqNo: number, _primaryTerm: number) => {
          writes.push(view);
          current = { view, seqNo: writes.length, primaryTerm: 1 };
          return 'updated' as const;
        }
      ),
    });
    const loadSnapshot = jest
      .fn()
      .mockResolvedValueOnce(snapshot())
      .mockResolvedValueOnce(
        snapshot({
          catalogVersion: 'sha256:breaking',
          activeVersions: { '.abuseipdb': '2.0.0' },
          versions: [
            { id: '.abuseipdb', version: '2.0.0', status: 'active' },
            { id: '.abuseipdb', version: '1.1.0', status: 'published' },
            { id: '.abuseipdb', version: '1.0.0', status: 'published' },
          ],
          assets: [ABUSEIPDB_2_0_0_BREAKING],
        })
      );
    const service = createService(createSource(loadSnapshot), storage);

    await service.start(createDeps());
    await service.refreshFromRegistry();
    await service.refreshFromRegistry();
    service.stop();

    const health = service.getHealth();
    expect(health.registeredVersionsByType['.abuseipdb'].activeVersion).toBe('1.1.0');
    expect(health.incompatibleVersions).toEqual([
      expect.objectContaining({
        id: '.abuseipdb',
        version: '2.0.0',
        activeVersion: '1.1.0',
        reasons: expect.arrayContaining([expect.stringContaining('config.baseUrl was removed')]),
      }),
    ]);
    expect(storage.putDefinitionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ version: '2.0.0' })
    );
    expect(writes[writes.length - 1]).toEqual(
      expect.objectContaining({
        catalogVersion: 'sha256:breaking',
        rows: expect.arrayContaining([
          expect.objectContaining({ version: '2.0.0', status: 'incompatible' }),
          expect.objectContaining({ version: '1.1.0', status: 'active' }),
          expect.objectContaining({ version: '1.0.0', status: 'published' }),
        ]),
      })
    );
    expect(health.versions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ version: '2.0.0', status: 'incompatible' }),
        expect.objectContaining({ version: '1.1.0', status: 'active' }),
      ])
    );
  });

  it('treats a 409 definition create as success', async () => {
    const storage = createStorage({
      putDefinitionCreate: jest.fn().mockResolvedValue('exists'),
    });
    const registerType = jest.fn();
    const service = createService(createSource(jest.fn().mockResolvedValue(snapshot())), storage);

    await service.start(createDeps({ registerType }));
    await expect(service.refreshFromRegistry()).resolves.toBeUndefined();
    service.stop();
    expect(registerType).toHaveBeenCalledTimes(1);
    expect(storage.putCatalogView).toHaveBeenCalled();
  });

  it('retries a catalog CAS conflict once', async () => {
    const existing = {
      view: storedView([{ id: '.abuseipdb', version: '1.1.0', contentHash: 'sha256:old' }]),
      seqNo: 1,
      primaryTerm: 1,
    };
    const retried = { ...existing, seqNo: 2 };
    const storage = createStorage({
      getCatalogView: jest.fn().mockResolvedValueOnce(existing).mockResolvedValueOnce(retried),
      putCatalogViewCas: jest
        .fn()
        .mockResolvedValueOnce('conflict')
        .mockResolvedValueOnce('updated'),
    });
    const service = createService(createSource(jest.fn().mockResolvedValue(snapshot())), storage);

    await service.start(createDeps());
    await service.refreshFromRegistry();
    service.stop();

    expect(storage.putCatalogViewCas).toHaveBeenCalledTimes(2);
    expect(storage.putCatalogViewCas).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ catalogVersion: CATALOG_VERSION }),
      1,
      1
    );
    expect(storage.putCatalogViewCas).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ catalogVersion: CATALOG_VERSION }),
      2,
      1
    );
  });

  it('late-registers only ids that boot did not register', async () => {
    const registerType = jest.fn();
    const storage = createStorage();
    const service = createService(
      createSource(
        jest.fn().mockResolvedValue(
          snapshot({
            activeVersions: { '.abuseipdb': '1.1.0', '.otheripdb': '1.0.0' },
            versions: [
              ...snapshot().versions,
              { id: '.otheripdb', version: '1.0.0', status: 'active' },
            ],
            assets: [...snapshot().assets, OTHER_1_0_0],
          })
        )
      ),
      storage
    );
    service.recordIndexBoot({
      types: [
        fakeBuildType({
          id: '.abuseipdb',
          versions: [materializeDeclarativeAsset(ABUSEIPDB_1_1_0)],
          activeVersion: '1.1.0',
        }),
      ],
      view: storedView([
        { id: '.abuseipdb', version: '1.1.0', contentHash: ABUSEIPDB_1_1_0.contentHash },
      ]),
      pinnedVersionsMissing: [],
    });

    await service.start(createDeps({ registerType }));
    await service.refreshFromRegistry();
    service.stop();

    expect(registerType).toHaveBeenCalledTimes(1);
    expect(registerType.mock.calls[0][0].id).toBe('.otheripdb');
    expect(service.getHealth().registeredTypeIds).toEqual(['.abuseipdb', '.otheripdb']);
  });

  it('skips an id that is already registered in the actions registry by another source', async () => {
    const registerType = jest.fn();
    const service = createService(createSource(jest.fn().mockResolvedValue(snapshot())));

    await service.start(
      createDeps({ registerType, isTypeRegistered: (id) => id === '.abuseipdb' })
    );
    await service.refreshFromRegistry();
    service.stop();

    expect(registerType).not.toHaveBeenCalled();
    expect(service.getHealth().skipped).toEqual([
      { id: '.abuseipdb', version: '1.1.0', reason: 'already_registered' },
    ]);
  });

  it('does not re-register an id on a second refresh', async () => {
    const registerType = jest.fn();
    const service = createService(createSource(jest.fn().mockResolvedValue(snapshot())));

    await service.start(createDeps({ registerType }));
    await service.refreshFromRegistry();
    await service.refreshFromRegistry();
    service.stop();

    expect(registerType).toHaveBeenCalledTimes(1);
  });

  it('keeps index-backed types registered and ready when a later refresh fails', async () => {
    const loadSnapshot = jest
      .fn()
      .mockResolvedValueOnce(snapshot())
      .mockRejectedValueOnce(new Error('catalog down'));
    const service = createService(createSource(loadSnapshot));

    await service.start(createDeps());
    await service.refreshFromRegistry();
    await expect(service.refreshFromRegistry()).rejects.toThrow('catalog down');
    service.stop();

    expect(service.getHealth()).toEqual(
      expect.objectContaining({
        ready: true,
        registeredTypeIds: ['.abuseipdb'],
        lastError: expect.objectContaining({ message: 'catalog down' }),
        indexReady: true,
      })
    );
  });

  it('records lastError when the catalog is down and nothing was registered', async () => {
    const service = createService(
      createSource(jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED')))
    );

    await service.start(createDeps());
    await expect(service.refreshFromRegistry()).rejects.toThrow('connect ECONNREFUSED');
    service.stop();

    expect(service.getHealth()).toEqual(
      expect.objectContaining({
        ready: false,
        indexReady: false,
        lastError: expect.objectContaining({ message: 'connect ECONNREFUSED' }),
      })
    );
  });

  it('reports pinned versions missing from both the index and the manifest', async () => {
    const savedObjectsRepository = {
      find: jest.fn().mockResolvedValue({
        aggregations: {
          types: {
            buckets: [
              { key: '.abuseipdb', versions: { buckets: [{ key: '1.0.0' }, { key: '0.9.0' }] } },
            ],
          },
        },
      }),
    } as unknown as PinnedVersionsClient;
    const service = createService(createSource(jest.fn().mockResolvedValue(snapshot())));

    await service.start(createDeps({ savedObjectsRepository }));
    await service.refreshFromRegistry();
    service.stop();

    expect(service.getHealth().pinnedVersionsMissing).toEqual([
      { id: '.abuseipdb', version: '0.9.0' },
    ]);
  });

  it('polls the index on every node and activates versions stored by other nodes', async () => {
    jest.useFakeTimers();
    const storage = createStorage();
    const service = createService(createSource(jest.fn()), storage);
    const registerType = jest.fn();
    await service.start(createDeps({ registerType }));

    storage.getCatalogView.mockResolvedValue({
      view: storedView(
        [
          {
            id: '.abuseipdb',
            version: '1.1.0',
            contentHash: ABUSEIPDB_1_1_0.contentHash,
            status: 'active',
          },
        ],
        'sha256:from-other-node'
      ),
      seqNo: 3,
      primaryTerm: 1,
    });
    storage.getDefinitions.mockResolvedValue(
      new Map([
        [
          'definition:.abuseipdb@1.1.0',
          {
            id: '.abuseipdb',
            version: '1.1.0',
            yaml: LIVE_ABUSEIPDB_1_1_0_YAML,
            iconSvg: LIVE_ABUSEIPDB_ICON,
            contentHash: ABUSEIPDB_1_1_0.contentHash,
            addedAt: '2026-09-18T00:00:00.000Z',
          },
        ],
      ])
    );

    jest.advanceTimersByTime(indexPollIntervalMs(60_000));
    await service.syncFromIndex();
    service.stop();

    expect(registerType).toHaveBeenCalledTimes(1);
    expect(service.getHealth()).toEqual(
      expect.objectContaining({
        registeredTypeIds: ['.abuseipdb'],
        indexCatalogVersion: 'sha256:from-other-node',
      })
    );
  });

  it('clears the index poll on stop', async () => {
    jest.useFakeTimers();
    const storage = createStorage();
    const service = createService(createSource(jest.fn()), storage);
    await service.start(createDeps());
    service.stop();

    jest.advanceTimersByTime(indexPollIntervalMs(60_000) * 2);
    expect(storage.getCatalogView).not.toHaveBeenCalled();
  });

  it('is ready after an index boot even before a registry refresh', () => {
    const service = createService(createSource(jest.fn()));
    service.recordIndexBoot({
      types: [
        fakeBuildType({
          id: '.abuseipdb',
          versions: [materializeDeclarativeAsset(ABUSEIPDB_1_1_0)],
          activeVersion: '1.1.0',
        }),
      ],
      view: storedView(
        [{ id: '.abuseipdb', version: '1.1.0', contentHash: ABUSEIPDB_1_1_0.contentHash }],
        'snapshot:abuseipdb-1.1.0'
      ),
      pinnedVersionsMissing: [{ id: '.abuseipdb', version: '0.9.0' }],
    });

    expect(service.getHealth()).toEqual(
      expect.objectContaining({
        ready: true,
        indexReady: true,
        registeredTypeIds: ['.abuseipdb'],
        registeredVersionsByType: { '.abuseipdb': { activeVersion: '1.1.0', versions: ['1.1.0'] } },
        pinnedVersionsMissing: [{ id: '.abuseipdb', version: '0.9.0' }],
        indexCatalogVersion: 'snapshot:abuseipdb-1.1.0',
      })
    );
  });

  it('coalesces concurrent refresh() calls into a single in-flight promise', async () => {
    let resolveSnapshot: (value: CatalogSnapshot) => void = () => {};
    const loadSnapshot = jest.fn(
      () =>
        new Promise<CatalogSnapshot>((resolve) => {
          resolveSnapshot = resolve;
        })
    );
    const service = createService(createSource(loadSnapshot));
    await service.start(createDeps());

    const first = service.refreshFromRegistry();
    const second = service.refreshFromRegistry();
    await new Promise((resolve) => setImmediate(resolve));
    expect(loadSnapshot).toHaveBeenCalledTimes(1);

    resolveSnapshot(snapshot());
    await Promise.all([first, second]);
    service.stop();
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
  });
});
