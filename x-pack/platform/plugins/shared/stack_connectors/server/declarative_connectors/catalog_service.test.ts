/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ConnectorSpec } from '@kbn/connector-specs';
import type { CatalogSnapshot, CatalogSpecSource } from './catalog_spec_source';
import type { DeclarativeCatalogRegistrationDeps } from './catalog_service';
import { DeclarativeCatalogService } from './catalog_service';
import {
  ABUSE_IPDB_SPEC_FIXTURE,
  LIVE_ABUSEIPDB_1_1_0_YAML,
  LIVE_ABUSEIPDB_ICON,
} from './test_fixtures';
import { getContentHash } from './icon';

const REGISTRY_URL = 'http://127.0.0.1:8089';

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

const createSource = (loadSnapshot: CatalogSpecSource['loadSnapshot']): CatalogSpecSource =>
  ({ loadSnapshot } as CatalogSpecSource);

const createDeps = (
  overrides: Partial<DeclarativeCatalogRegistrationDeps> = {}
): DeclarativeCatalogRegistrationDeps => ({
  registerSpec: jest.fn(),
  isTypeRegistered: jest.fn().mockReturnValue(false),
  ...overrides,
});

const createService = (
  source: CatalogSpecSource,
  overrides: { refreshIntervalMs?: number; startupBudgetMs?: number } = {}
) =>
  new DeclarativeCatalogService({
    source,
    registryUrl: REGISTRY_URL,
    refreshIntervalMs: overrides.refreshIntervalMs ?? 60_000,
    startupBudgetMs: overrides.startupBudgetMs ?? 6_000,
    logger: loggerMock.create(),
  });

describe('DeclarativeCatalogService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('populates health from the first refresh', async () => {
    const service = createService(createSource(jest.fn().mockResolvedValue(liveSnapshot())));

    await service.start(createDeps());

    expect(service.getHealth()).toEqual(
      expect.objectContaining({
        enabled: true,
        ready: true,
        sourceUrl: REGISTRY_URL,
        activeCatalogVersion:
          'sha256:dd864d3dc6f3cd562d2fb72f102f777e88061d253e60712521fda1b054e41403',
        versions: liveSnapshot().versions,
        skipped: liveSnapshot().skipped,
        registeredTypeIds: ['.abuseipdb'],
      })
    );
    expect(service.getHealth().lastRefreshAt).toEqual(expect.any(String));
    expect(service.getHealth().lastError).toBeUndefined();
    service.stop();
  });

  it('registers exactly .abuseipdb from the live 1.1.0 payload', async () => {
    const registerSpec = jest.fn();
    const service = createService(createSource(jest.fn().mockResolvedValue(liveSnapshot())));

    await service.start(createDeps({ registerSpec }));

    expect(registerSpec).toHaveBeenCalledTimes(1);
    const spec = registerSpec.mock.calls[0][0] as ConnectorSpec;
    expect(spec.metadata.id).toBe('.abuseipdb');
    expect(spec.metadata.displayName).toBe('AbuseIPDB (Declarative PoC)');
    expect(spec.metadata.isTechnicalPreview).toBe(true);
    expect(Object.keys(spec.actions)).toEqual(['checkIp', 'reportIp']);
    expect(service.getHealth().registeredTypeIds).toEqual(['.abuseipdb']);
    expect(service.getHealth().skipped).toEqual([
      { id: '.declarative-okta', version: '1.0.0', reason: 'reserved_prefix' },
    ]);
    service.stop();
  });

  it('skips an id that is already registered', async () => {
    const registerSpec = jest.fn();
    const service = createService(createSource(jest.fn().mockResolvedValue(liveSnapshot())));

    await service.start(
      createDeps({
        registerSpec,
        isTypeRegistered: (id) => id === '.abuseipdb',
      })
    );

    expect(registerSpec).not.toHaveBeenCalled();
    expect(service.getHealth().registeredTypeIds).toEqual([]);
    expect(service.getHealth().skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '.abuseipdb',
          reason: 'already_registered',
        }),
      ])
    );
    service.stop();
  });

  it('records a single bad asset as load_failed while still registering the good one', async () => {
    const registerSpec = jest.fn();
    const badYaml = ABUSE_IPDB_SPEC_FIXTURE.replace(
      'type: api_key_header',
      'type: future_auth_type'
    );
    const service = createService(
      createSource(
        jest.fn().mockResolvedValue(
          liveSnapshot({
            assets: [
              {
                yamlPath: 'http://127.0.0.1:8089/connectors/abuseipdb/1.1.0.yaml',
                yaml: LIVE_ABUSEIPDB_1_1_0_YAML,
                icon: LIVE_ABUSEIPDB_ICON,
              },
              {
                yamlPath: 'http://127.0.0.1:8089/connectors/bad.yaml',
                yaml: badYaml.replace(
                  /contentHash: sha256:[a-f0-9]{64}/,
                  `contentHash: ${getContentHash(
                    '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1H0z"/></svg>'
                  )}`
                ),
                icon: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1H0z"/></svg>',
              },
            ],
          })
        )
      )
    );

    await service.start(createDeps({ registerSpec }));

    expect(registerSpec).toHaveBeenCalledTimes(1);
    expect(registerSpec.mock.calls[0][0].metadata.id).toBe('.abuseipdb');
    expect(service.getHealth().skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '.abuseipdb',
          reason: 'load_failed',
          detail: expect.stringContaining('future_auth_type'),
        }),
      ])
    );
    service.stop();
  });

  it('does not re-register an id it already registered on a second refresh', async () => {
    const registerSpec = jest.fn();
    const loadSnapshot = jest.fn().mockResolvedValue(liveSnapshot());
    const service = createService(createSource(loadSnapshot), { refreshIntervalMs: 0 });

    await service.start(createDeps({ registerSpec }));
    await service.refresh();

    expect(registerSpec).toHaveBeenCalledTimes(1);
    expect(service.getHealth().registeredTypeIds).toEqual(['.abuseipdb']);
    service.stop();
  });

  it('resolves start() when the catalog is down and records lastError', async () => {
    const service = createService(
      createSource(jest.fn().mockRejectedValue(new Error('connect ECONNREFUSED')))
    );

    await expect(service.start(createDeps())).resolves.toBeUndefined();

    expect(service.getHealth()).toEqual(
      expect.objectContaining({
        enabled: true,
        ready: false,
        lastError: expect.objectContaining({
          message: 'connect ECONNREFUSED',
          at: expect.any(String),
        }),
      })
    );
    service.stop();
  });

  it('coalesces concurrent refresh() calls into a single in-flight promise', async () => {
    let resolveSnapshot: (snapshot: CatalogSnapshot) => void = () => {};
    const loadSnapshot = jest.fn(
      () =>
        new Promise<CatalogSnapshot>((resolve) => {
          resolveSnapshot = resolve;
        })
    );
    const service = createService(createSource(loadSnapshot), { refreshIntervalMs: 0 });

    const first = service.refresh();
    const second = service.refresh();
    expect(loadSnapshot).toHaveBeenCalledTimes(1);

    resolveSnapshot(liveSnapshot());
    await Promise.all([first, second]);
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
  });

  it('clears the refresh interval on stop()', async () => {
    jest.useFakeTimers();
    const loadSnapshot = jest.fn().mockResolvedValue(liveSnapshot());
    const service = createService(createSource(loadSnapshot), {
      refreshIntervalMs: 10_000,
      startupBudgetMs: 1_000,
    });

    await service.start(createDeps());
    expect(loadSnapshot).toHaveBeenCalledTimes(1);

    service.stop();
    await jest.advanceTimersByTimeAsync(30_000);
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
  });

  it('honors the startup budget under fake timers', async () => {
    jest.useFakeTimers();
    let resolveSnapshot: (snapshot: CatalogSnapshot) => void = () => {};
    const loadSnapshot = jest.fn(
      () =>
        new Promise<CatalogSnapshot>((resolve) => {
          resolveSnapshot = resolve;
        })
    );
    const service = createService(createSource(loadSnapshot), {
      refreshIntervalMs: 0,
      startupBudgetMs: 6_000,
    });

    let started = false;
    const startPromise = service.start(createDeps()).then(() => {
      started = true;
    });

    await jest.advanceTimersByTimeAsync(5_999);
    expect(started).toBe(false);

    await jest.advanceTimersByTimeAsync(1);
    await startPromise;
    expect(started).toBe(true);

    resolveSnapshot(liveSnapshot());
    await Promise.resolve();
    service.stop();
  });

  it('recovers on the next interval tick after a failed first refresh', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-17T12:00:00.000Z'));
    const loadSnapshot = jest
      .fn()
      .mockRejectedValueOnce(new Error('connect ECONNREFUSED'))
      .mockResolvedValueOnce(liveSnapshot());
    const registerSpec = jest.fn();
    const service = createService(createSource(loadSnapshot), {
      refreshIntervalMs: 10_000,
      startupBudgetMs: 1_000,
    });

    await service.start(createDeps({ registerSpec }));
    expect(service.getHealth().ready).toBe(false);
    expect(service.getHealth().lastError).toEqual(
      expect.objectContaining({ message: 'connect ECONNREFUSED' })
    );
    expect(registerSpec).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(10_000);

    expect(registerSpec).toHaveBeenCalledTimes(1);
    expect(service.getHealth().ready).toBe(true);
    expect(service.getHealth().lastError).toBeUndefined();
    expect(service.getHealth().lastRefreshAt).toBe('2026-09-17T12:00:10.000Z');
    expect(service.getHealth().registeredTypeIds).toEqual(['.abuseipdb']);
    service.stop();
  });

  it('does not hold start() past the budget and still registers when a hung refresh later completes', async () => {
    jest.useFakeTimers();
    let resolveSnapshot: (snapshot: CatalogSnapshot) => void = () => {};
    const loadSnapshot = jest.fn(
      () =>
        new Promise<CatalogSnapshot>((resolve) => {
          resolveSnapshot = resolve;
        })
    );
    const registerSpec = jest.fn();
    const service = createService(createSource(loadSnapshot), {
      refreshIntervalMs: 0,
      startupBudgetMs: 6_000,
    });

    const startPromise = service.start(createDeps({ registerSpec }));
    await jest.advanceTimersByTimeAsync(6_000);
    await startPromise;
    expect(registerSpec).not.toHaveBeenCalled();

    resolveSnapshot(liveSnapshot());
    await Promise.resolve();
    await Promise.resolve();

    expect(registerSpec).toHaveBeenCalledTimes(1);
    expect(service.getHealth().registeredTypeIds).toEqual(['.abuseipdb']);
    service.stop();
  });

  it('keeps registered ids and lastRefreshAt when a later refresh fails', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-09-17T12:00:00.000Z'));
    const loadSnapshot = jest
      .fn()
      .mockResolvedValueOnce(liveSnapshot())
      .mockRejectedValueOnce(new Error('catalog down'));
    const service = createService(createSource(loadSnapshot), { refreshIntervalMs: 0 });

    await service.start(createDeps());
    expect(service.getHealth().registeredTypeIds).toEqual(['.abuseipdb']);
    expect(service.getHealth().lastRefreshAt).toBe('2026-09-17T12:00:00.000Z');

    await expect(service.refresh()).rejects.toThrow('catalog down');
    expect(service.getHealth().registeredTypeIds).toEqual(['.abuseipdb']);
    expect(service.getHealth().lastRefreshAt).toBe('2026-09-17T12:00:00.000Z');
    expect(service.getHealth().ready).toBe(false);
    expect(service.getHealth().lastError).toEqual(
      expect.objectContaining({ message: 'catalog down' })
    );
    service.stop();
  });
});
