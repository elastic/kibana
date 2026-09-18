/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fetch from 'node-fetch';
import { loggerMock } from '@kbn/logging-mocks';
import { CatalogSpecSource } from './catalog_spec_source';
import { getContentHash } from './icon';
import {
  createLiveCatalogFetchDouble,
  LIVE_ABUSEIPDB_1_0_0_YAML,
  LIVE_ABUSEIPDB_1_1_0_YAML,
  LIVE_ABUSEIPDB_ICON,
  LIVE_CATALOG_MANIFEST,
  LIVE_CATALOG_PATHS,
  LIVE_OKTA_1_0_0_YAML,
  LIVE_OKTA_ICON,
} from './test_fixtures';

jest.mock('node-fetch');

const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;
const REGISTRY_URL = 'http://127.0.0.1:8089';

const createSource = () =>
  new CatalogSpecSource({
    registryUrl: REGISTRY_URL,
    logger: loggerMock.create(),
  });

describe('CatalogSpecSource', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('returns every listed version, active and published, with its identity', async () => {
    mockedFetch.mockImplementation(createLiveCatalogFetchDouble() as unknown as typeof fetch);

    const snapshot = await createSource().loadSnapshot();

    expect(snapshot.catalogVersion).toBe(
      'sha256:72f5f754750fbdc435db7567e208a1ebffebe4dff5633f401457fea29d2e8e95'
    );
    expect(snapshot.activeVersions).toEqual({ '.abuseipdb': '1.1.0', '.okta': '1.0.0' });
    expect(snapshot.assets).toHaveLength(3);
    expect(snapshot.assets[0]).toEqual(
      expect.objectContaining({
        id: '.abuseipdb',
        version: '1.1.0',
        contentHash: getContentHash(LIVE_ABUSEIPDB_1_1_0_YAML),
        yaml: LIVE_ABUSEIPDB_1_1_0_YAML,
        icon: LIVE_ABUSEIPDB_ICON,
        yamlPath: 'http://127.0.0.1:8089/connectors/abuseipdb/1.1.0.yaml',
      })
    );
    expect(snapshot.assets[1]).toEqual(
      expect.objectContaining({
        id: '.abuseipdb',
        version: '1.0.0',
        yaml: LIVE_ABUSEIPDB_1_0_0_YAML,
      })
    );
    expect(snapshot.assets[2]).toEqual(
      expect.objectContaining({
        id: '.okta',
        version: '1.0.0',
        yaml: LIVE_OKTA_1_0_0_YAML,
        icon: LIVE_OKTA_ICON,
        yamlPath: 'http://127.0.0.1:8089/connectors/okta/1.0.0.yaml',
      })
    );
    expect(snapshot.versions).toEqual([
      { id: '.abuseipdb', version: '1.1.0', status: 'active' },
      { id: '.abuseipdb', version: '1.0.0', status: 'published' },
      { id: '.okta', version: '1.0.0', status: 'active' },
    ]);
    expect(snapshot.skipped).toEqual([]);

    const requestedPaths = mockedFetch.mock.calls.map(([url]) => new URL(String(url)).pathname);
    expect(requestedPaths[0]).toBe(LIVE_CATALOG_PATHS.manifest);
    expect(requestedPaths.slice(1).sort()).toEqual(
      [
        LIVE_CATALOG_PATHS.abuseipdbDefinition,
        LIVE_CATALOG_PATHS.abuseipdbIcon,
        LIVE_CATALOG_PATHS.abuseipdbPublishedDefinition,
        LIVE_CATALOG_PATHS.abuseipdbPublishedIcon,
        LIVE_CATALOG_PATHS.oktaDefinition,
        LIVE_CATALOG_PATHS.oktaIcon,
      ].sort()
    );
  });

  it('loadRawSpecs keeps only active assets', async () => {
    mockedFetch.mockImplementation(createLiveCatalogFetchDouble() as unknown as typeof fetch);

    const assets = await createSource().loadRawSpecs();

    expect(assets.map((asset) => asset.yamlPath)).toEqual([
      'http://127.0.0.1:8089/connectors/abuseipdb/1.1.0.yaml',
      'http://127.0.0.1:8089/connectors/okta/1.0.0.yaml',
    ]);
  });

  it('skips fetching definitions whose stored hash matches the manifest', async () => {
    mockedFetch.mockImplementation(createLiveCatalogFetchDouble() as unknown as typeof fetch);

    const snapshot = await createSource().loadSnapshot({
      storedHashes: new Map([
        ['.abuseipdb@1.1.0', getContentHash(LIVE_ABUSEIPDB_1_1_0_YAML)],
        ['.okta@1.0.0', 'sha256:stale'],
      ]),
    });

    expect(snapshot.assets.map((asset) => `${asset.id}@${asset.version}`)).toEqual([
      '.abuseipdb@1.0.0',
      '.okta@1.0.0',
    ]);
    expect(snapshot.versions).toHaveLength(3);
    const requestedPaths = mockedFetch.mock.calls.map(([url]) => new URL(String(url)).pathname);
    expect(requestedPaths).not.toContain(LIVE_CATALOG_PATHS.abuseipdbDefinition);
    expect(requestedPaths).toContain(LIVE_CATALOG_PATHS.oktaDefinition);
  });

  it('fetches definitions with bounded concurrency', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const double = createLiveCatalogFetchDouble();
    mockedFetch.mockImplementation((async (url: string) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return double(url);
    }) as unknown as typeof fetch);

    const source = new CatalogSpecSource({
      registryUrl: REGISTRY_URL,
      logger: loggerMock.create(),
      fetchConcurrency: 1,
    });
    const snapshot = await source.loadSnapshot();

    expect(snapshot.assets).toHaveLength(3);
    expect(maxInFlight).toBe(1);
  });

  it('loads one exact id@version from the manifest', async () => {
    mockedFetch.mockImplementation(createLiveCatalogFetchDouble() as unknown as typeof fetch);

    const source = createSource();
    const published = await source.loadVersion('.abuseipdb', '1.0.0');
    expect(published).toEqual(
      expect.objectContaining({
        id: '.abuseipdb',
        version: '1.0.0',
        yaml: LIVE_ABUSEIPDB_1_0_0_YAML,
      })
    );
    await expect(source.loadVersion('.abuseipdb', '9.9.9')).resolves.toBeUndefined();
  });

  it('skips connector ids reserved with the .declarative- prefix', async () => {
    const manifest = {
      schemaVersion: 1,
      catalogVersion: 'sha256:reserved',
      activeVersions: { '.declarative-okta': '1.0.0' },
      connectors: [
        {
          id: '.declarative-okta',
          version: '1.0.0',
          definitionUrl: 'connectors/okta/1.0.0.yaml',
          contentHash: 'sha256:e6ccf241026f7522068eb86cec5b13e06be9208741b8b7db8df510817a790591',
        },
      ],
    };
    mockedFetch.mockImplementation(
      createLiveCatalogFetchDouble({
        [LIVE_CATALOG_PATHS.manifest]: { body: JSON.stringify(manifest) },
      }) as unknown as typeof fetch
    );

    const snapshot = await createSource().loadSnapshot();

    expect(snapshot.assets).toHaveLength(0);
    expect(snapshot.versions).toEqual([]);
    expect(snapshot.skipped).toEqual([
      { id: '.declarative-okta', version: '1.0.0', reason: 'reserved_prefix' },
    ]);
    const requestedPaths = mockedFetch.mock.calls.map(([url]) => new URL(String(url)).pathname);
    expect(requestedPaths).toEqual([LIVE_CATALOG_PATHS.manifest]);
  });

  it('rejects a YAML hash mismatch', async () => {
    const manifest = JSON.parse(LIVE_CATALOG_MANIFEST) as {
      connectors: Array<{ id: string; version: string; contentHash: string }>;
    };
    manifest.connectors[0].contentHash = `sha256:${'0'.repeat(64)}`;
    mockedFetch.mockImplementation(
      createLiveCatalogFetchDouble({
        [LIVE_CATALOG_PATHS.manifest]: { body: JSON.stringify(manifest) },
      }) as unknown as typeof fetch
    );

    const snapshot = await createSource().loadSnapshot();

    expect(snapshot.assets.map((asset) => asset.yamlPath)).toEqual([
      'http://127.0.0.1:8089/connectors/abuseipdb/1.0.0.yaml',
      'http://127.0.0.1:8089/connectors/okta/1.0.0.yaml',
    ]);
    expect(snapshot.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '.abuseipdb',
          version: '1.1.0',
          reason: 'load_failed',
          detail: expect.stringContaining('Integrity check failed'),
        }),
      ])
    );
  });

  it('rejects an icon hash mismatch', async () => {
    mockedFetch.mockImplementation(
      createLiveCatalogFetchDouble({
        [LIVE_CATALOG_PATHS.abuseipdbIcon]: { body: '<svg xmlns="http://www.w3.org/2000/svg"/>' },
      }) as unknown as typeof fetch
    );

    const snapshot = await createSource().loadSnapshot();

    // Only the 1.1.0 icon path is tampered with; 1.0.0 resolves its own icon path.
    expect(snapshot.assets.map((asset) => asset.yamlPath)).toEqual([
      'http://127.0.0.1:8089/connectors/abuseipdb/1.0.0.yaml',
      'http://127.0.0.1:8089/connectors/okta/1.0.0.yaml',
    ]);
    expect(snapshot.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: '.abuseipdb',
          version: '1.1.0',
          reason: 'load_failed',
          detail: expect.stringContaining('Icon integrity check failed'),
        }),
      ])
    );
  });

  it('rejects a manifest/definition id@version mismatch', async () => {
    const mismatchedYaml = LIVE_ABUSEIPDB_1_1_0_YAML.replace('version: 1.1.0', 'version: 9.9.9');
    mockedFetch.mockImplementation(
      createLiveCatalogFetchDouble({
        [LIVE_CATALOG_PATHS.abuseipdbDefinition]: {
          body: mismatchedYaml,
        },
        [LIVE_CATALOG_PATHS.manifest]: {
          body: JSON.stringify({
            ...JSON.parse(LIVE_CATALOG_MANIFEST),
            connectors: [
              {
                id: '.abuseipdb',
                version: '1.1.0',
                definitionUrl: 'connectors/abuseipdb/1.1.0.yaml',
                contentHash: getContentHash(mismatchedYaml),
              },
            ],
          }),
        },
      }) as unknown as typeof fetch
    );

    const snapshot = await createSource().loadSnapshot();

    expect(snapshot.assets).toHaveLength(0);
    expect(snapshot.skipped).toEqual([
      expect.objectContaining({
        id: '.abuseipdb',
        version: '1.1.0',
        reason: 'load_failed',
        detail: expect.stringContaining('does not match its definition'),
      }),
    ]);
  });
});
