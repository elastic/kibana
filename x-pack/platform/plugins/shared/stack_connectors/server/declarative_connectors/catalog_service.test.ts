/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import type { ConnectorSpec } from '@kbn/connector-specs';
import type { CatalogSnapshot, CatalogSpecSource } from './catalog_spec_source';
import type { DeclarativeCatalogRegistrationDeps } from './catalog_service';
import { DeclarativeCatalogService } from './catalog_service';
import type { ConnectorCatalogStorage, StoredCatalogView } from './catalog_storage';
import {
  ABUSE_IPDB_SPEC_FIXTURE,
  CONNECTOR_ICON_FIXTURE,
  LIVE_ABUSEIPDB_1_1_0_YAML,
  LIVE_ABUSEIPDB_ICON,
} from './test_fixtures';
import { getContentHash } from './icon';

const REGISTRY_URL = 'http://127.0.0.1:8089';
const KIBANA_MINOR = '9.3';
const esClient = {} as ElasticsearchClient;

const liveSnapshot = (overrides: Partial<CatalogSnapshot> = {}): CatalogSnapshot => ({
  catalogVersion: 'sha256:dd864d3dc6f3cd562d2fb72f102f777e88061d253e60712521fda1b054e41403',
  versions: [
    { id: '.abuseipdb', version: '1.1.0', status: 'active' },
    { id: '.abuseipdb', version: '1.0.0', status: 'published' },
  ],
  assets: [
    {
      yamlPath: 'http://127.0.0.1:8089/connectors/abuseipdb/1.1.0.yaml',
      yaml: LIVE_ABUSEIPDB_1_1_0_YAML,
      icon: LIVE_ABUSEIPDB_ICON,
    },
  ],
  skipped: [{ id: '.declarative-okta', version: '1.0.0', reason: 'reserved_prefix' }],
  ...overrides,
});

const otherYaml = ABUSE_IPDB_SPEC_FIXTURE.replace('id: .abuseipdb', 'id: .otheripdb').replace(
  'version: 1.0.0',
  'version: 1.0.0'
);

const createSource = (loadSnapshot: CatalogSpecSource['loadSnapshot']): CatalogSpecSource =>
  ({ loadSnapshot } as CatalogSpecSource);

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

const createDeps = (
  overrides: Partial<DeclarativeCatalogRegistrationDeps> = {}
): DeclarativeCatalogRegistrationDeps => ({
  registerSpec: jest.fn(),
  isTypeRegistered: jest.fn().mockReturnValue(false),
  esClient,
  ...overrides,
});

const createService = (
  source: CatalogSpecSource,
  storage: jest.Mocked<ConnectorCatalogStorage> = createStorage()
) =>
  new DeclarativeCatalogService({
    source,
    registryUrl: REGISTRY_URL,
    refreshIntervalMs: 60_000,
    kibanaMinor: KIBANA_MINOR,
    logger: loggerMock.create(),
    createStorage: () => storage,
  });

const storedView = (
  contentHash = getContentHash(LIVE_ABUSEIPDB_1_1_0_YAML)
): StoredCatalogView => ({
  catalogVersion: 'snapshot:abuseipdb-1.1.0',
  fetchedAt: '2026-09-17T12:00:00.000Z',
  kibanaMinor: KIBANA_MINOR,
  rows: [
    {
      id: '.abuseipdb',
      version: '1.1.0',
      contentHash,
      definitionId: 'definition:.abuseipdb@1.1.0',
    },
  ],
});

describe('DeclarativeCatalogService', () => {
  it('registers exactly .abuseipdb from the live 1.1.0 payload and keeps .declarative-* skipped', async () => {
    const registerSpec = jest.fn();
    const storage = createStorage();
    const service = createService(
      createSource(jest.fn().mockResolvedValue(liveSnapshot())),
      storage
    );

    await service.start(createDeps({ registerSpec }));
    await service.refreshFromRegistry();

    expect(registerSpec).toHaveBeenCalledTimes(1);
    const spec = registerSpec.mock.calls[0][0] as ConnectorSpec;
    expect(spec.metadata.id).toBe('.abuseipdb');
    expect(spec.metadata.displayName).toBe('AbuseIPDB (Declarative PoC)');
    expect(service.getHealth()).toEqual(
      expect.objectContaining({
        enabled: true,
        ready: true,
        registeredTypeIds: ['.abuseipdb'],
        skipped: [{ id: '.declarative-okta', version: '1.0.0', reason: 'reserved_prefix' }],
        indexReady: true,
        indexCatalogVersion:
          'sha256:dd864d3dc6f3cd562d2fb72f102f777e88061d253e60712521fda1b054e41403',
      })
    );
  });

  it('skips writing a definition when the stored contentHash already matches', async () => {
    const hash = getContentHash(LIVE_ABUSEIPDB_1_1_0_YAML);
    const storage = createStorage({
      getCatalogView: jest.fn().mockResolvedValue({
        view: storedView(hash),
        seqNo: 1,
        primaryTerm: 1,
      }),
    });
    const service = createService(
      createSource(jest.fn().mockResolvedValue(liveSnapshot())),
      storage
    );

    await service.start(createDeps());
    await service.refreshFromRegistry();

    expect(storage.putDefinitionCreate).not.toHaveBeenCalled();
  });

  it('treats a 409 definition create as success', async () => {
    const storage = createStorage({
      putDefinitionCreate: jest.fn().mockResolvedValue('exists'),
    });
    const registerSpec = jest.fn();
    const service = createService(
      createSource(jest.fn().mockResolvedValue(liveSnapshot())),
      storage
    );

    await service.start(createDeps({ registerSpec }));
    await expect(service.refreshFromRegistry()).resolves.toBeUndefined();
    expect(registerSpec).toHaveBeenCalledTimes(1);
    expect(storage.putCatalogView).toHaveBeenCalled();
  });

  it('retries a catalog CAS conflict once', async () => {
    const existing = {
      view: storedView('sha256:old'),
      seqNo: 1,
      primaryTerm: 1,
    };
    const retried = {
      view: { ...storedView('sha256:old'), catalogVersion: 'sha256:other' },
      seqNo: 2,
      primaryTerm: 1,
    };
    const storage = createStorage({
      getCatalogView: jest.fn().mockResolvedValueOnce(existing).mockResolvedValueOnce(retried),
      putCatalogViewCas: jest
        .fn()
        .mockResolvedValueOnce('conflict')
        .mockResolvedValueOnce('updated'),
    });
    const service = createService(
      createSource(jest.fn().mockResolvedValue(liveSnapshot())),
      storage
    );

    await service.start(createDeps());
    await service.refreshFromRegistry();

    expect(storage.putCatalogViewCas).toHaveBeenCalledTimes(2);
    expect(storage.putCatalogViewCas).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        catalogVersion: liveSnapshot().catalogVersion,
      }),
      1,
      1
    );
    expect(storage.putCatalogViewCas).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        catalogVersion: liveSnapshot().catalogVersion,
      }),
      2,
      1
    );
  });

  it('late-registers only ids that are not already registered', async () => {
    const registerSpec = jest.fn();
    const storage = createStorage();
    const service = createService(
      createSource(
        jest.fn().mockResolvedValue(
          liveSnapshot({
            assets: [
              ...liveSnapshot().assets,
              {
                yamlPath: 'other.yaml',
                yaml: otherYaml,
                icon: CONNECTOR_ICON_FIXTURE,
              },
            ],
          })
        )
      ),
      storage
    );
    service.recordIndexBoot({
      specs: [{ metadata: { id: '.abuseipdb' } } as ConnectorSpec],
      view: storedView(),
    });

    await service.start(createDeps({ registerSpec }));
    await service.refreshFromRegistry();

    expect(registerSpec).toHaveBeenCalledTimes(1);
    expect(registerSpec.mock.calls[0][0].metadata.id).toBe('.otheripdb');
    expect(service.getHealth().registeredTypeIds).toEqual(['.abuseipdb', '.otheripdb']);
  });

  it('skips an id that is already registered in the actions registry', async () => {
    const registerSpec = jest.fn();
    const service = createService(createSource(jest.fn().mockResolvedValue(liveSnapshot())));

    await service.start(
      createDeps({
        registerSpec,
        isTypeRegistered: (id) => id === '.abuseipdb',
      })
    );
    await service.refreshFromRegistry();

    expect(registerSpec).not.toHaveBeenCalled();
    expect(service.getHealth().skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '.abuseipdb',
          reason: 'already_registered',
        }),
      ])
    );
  });

  it('does not re-register an id it already registered on a second refresh', async () => {
    const registerSpec = jest.fn();
    const loadSnapshot = jest.fn().mockResolvedValue(liveSnapshot());
    const service = createService(createSource(loadSnapshot));

    await service.start(createDeps({ registerSpec }));
    await service.refreshFromRegistry();
    await service.refreshFromRegistry();

    expect(registerSpec).toHaveBeenCalledTimes(1);
    expect(service.getHealth().registeredTypeIds).toEqual(['.abuseipdb']);
  });

  it('keeps index-backed types registered and ready when a later refresh fails', async () => {
    const loadSnapshot = jest
      .fn()
      .mockResolvedValueOnce(liveSnapshot())
      .mockRejectedValueOnce(new Error('catalog down'));
    const service = createService(createSource(loadSnapshot));

    await service.start(createDeps());
    await service.refreshFromRegistry();
    expect(service.getHealth().registeredTypeIds).toEqual(['.abuseipdb']);

    await expect(service.refreshFromRegistry()).rejects.toThrow('catalog down');
    expect(service.getHealth()).toEqual(
      expect.objectContaining({
        ready: true,
        registeredTypeIds: ['.abuseipdb'],
        lastError: expect.objectContaining({ message: 'catalog down' }),
        indexReady: true,
      })
    );
  });

  it('records lastError when the catalog is down and no types were registered', async () => {
    const service = createService(
      createSource(jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED')))
    );

    await service.start(createDeps());
    await expect(service.refreshFromRegistry()).rejects.toThrow('connect ECONNREFUSED');

    expect(service.getHealth()).toEqual(
      expect.objectContaining({
        enabled: true,
        ready: false,
        indexReady: false,
        lastError: expect.objectContaining({
          message: 'connect ECONNREFUSED',
        }),
      })
    );
  });

  it('is ready after an index boot even before a registry refresh', () => {
    const service = createService(createSource(jest.fn()));
    service.recordIndexBoot({
      specs: [{ metadata: { id: '.abuseipdb' } } as ConnectorSpec],
      view: storedView(),
    });

    expect(service.getHealth()).toEqual(
      expect.objectContaining({
        ready: true,
        indexReady: true,
        registeredTypeIds: ['.abuseipdb'],
        indexCatalogVersion: 'snapshot:abuseipdb-1.1.0',
      })
    );
  });

  it('coalesces concurrent refresh() calls into a single in-flight promise', async () => {
    let resolveSnapshot: (snapshot: CatalogSnapshot) => void = () => {};
    const loadSnapshot = jest.fn(
      () =>
        new Promise<CatalogSnapshot>((resolve) => {
          resolveSnapshot = resolve;
        })
    );
    const service = createService(createSource(loadSnapshot));
    await service.start(createDeps());

    const first = service.refresh();
    const second = service.refresh();
    expect(loadSnapshot).toHaveBeenCalledTimes(1);

    resolveSnapshot(liveSnapshot());
    await Promise.all([first, second]);
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
  });
});
