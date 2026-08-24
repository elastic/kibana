/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { errors } from '@elastic/elasticsearch';
import nock from 'nock';
import { loggerMock } from '@kbn/logging-mocks';
import { DeclarativeConnectorCatalogService } from './catalog_service';
import type { DeclarativeConnectorCatalogStorage } from './storage';
import {
  ABUSE_IPDB_SPEC_FIXTURE,
  CONNECTOR_ICON_FIXTURE,
  OKTA_SPEC_FIXTURE,
} from './test_fixtures';
import type { StoredDeclarativeCatalog } from './types';

const abuseIpDbRaw = ABUSE_IPDB_SPEC_FIXTURE;
const oktaRaw = OKTA_SPEC_FIXTURE;
const contentHash = (raw: string): string =>
  `sha256:${createHash('sha256').update(raw, 'utf8').digest('hex')}`;

const manifest = {
  schemaVersion: 1,
  catalogVersion: 'test-catalog',
  activeVersions: {
    '.declarative-abuseipdb': '1.0.0',
    '.declarative-okta': '1.0.0',
  },
  connectors: [
    {
      id: '.declarative-abuseipdb',
      version: '1.0.0',
      definitionUrl: 'connectors/abuseipdb/1.0.0.yaml',
      contentHash: contentHash(abuseIpDbRaw),
    },
    {
      id: '.declarative-okta',
      version: '1.0.0',
      definitionUrl: 'connectors/okta/1.0.0.yaml',
      contentHash: contentHash(oktaRaw),
    },
  ],
};

const createService = () =>
  new DeclarativeConnectorCatalogService({
    registryUrl: 'http://catalog.test',
    refreshIntervalMs: 0,
    connectorMetadata: [
      {
        id: '.declarative-abuseipdb',
        displayName: 'AbuseIPDB',
        description: 'Test AbuseIPDB connector',
        minimumLicense: 'gold',
        supportedFeatureIds: ['workflows'],
      },
      {
        id: '.declarative-okta',
        displayName: 'Okta',
        description: 'Test Okta connector',
        minimumLicense: 'enterprise',
        supportedFeatureIds: ['workflows'],
      },
    ],
    logger: loggerMock.create(),
  });

const createStorage = (): jest.Mocked<DeclarativeConnectorCatalogStorage> =>
  ({
    get: jest.fn().mockRejectedValue(
      new errors.ResponseError({
        statusCode: 404,
        body: {},
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    ),
    index: jest.fn().mockResolvedValue({}),
  } as unknown as jest.Mocked<DeclarativeConnectorCatalogStorage>);

describe('DeclarativeConnectorCatalogService', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('validates, persists, and activates a complete catalog atomically', async () => {
    const storage = createStorage();
    nock('http://catalog.test')
      .get('/catalog.json')
      .reply(200, manifest)
      .get('/connectors/abuseipdb/1.0.0.yaml')
      .reply(200, abuseIpDbRaw)
      .get('/connectors/abuseipdb/1.0.0.svg')
      .reply(200, CONNECTOR_ICON_FIXTURE)
      .get('/connectors/okta/1.0.0.yaml')
      .reply(200, oktaRaw);

    const service = createService();
    service.start(storage);
    const spec = await service.getSpec('.declarative-okta', '1.0.0');

    expect(spec?.metadata.id).toBe('.declarative-okta');
    expect(spec?.version).toBe('1.0.0');
    expect((await service.getSpec('.declarative-abuseipdb', '1.0.0'))?.metadata.icon).toEqual(
      expect.stringMatching(/^data:image\/svg\+xml;base64,/)
    );
    expect(storage.index).toHaveBeenCalledWith({
      id: 'active',
      document: {
        catalog: expect.objectContaining({
          catalogVersion: 'test-catalog',
          activeVersions: {
            '.declarative-abuseipdb': '1.0.0',
            '.declarative-okta': '1.0.0',
          },
        }),
        updated_at: expect.any(String),
      },
    });
    expect(service.getHealth()).toEqual(
      expect.objectContaining({
        ready: true,
        activeCatalogVersion: 'test-catalog',
        cachedSpecificationCount: 2,
      })
    );
    service.stop();
  });

  it('uses the durable last-known-good catalog when the registry is unavailable', async () => {
    const storedCatalog: StoredDeclarativeCatalog = {
      catalogVersion: 'last-known-good',
      activeVersions: {
        '.declarative-abuseipdb': '1.0.0',
        '.declarative-okta': '1.0.0',
      },
      specifications: [
        { ...manifest.connectors[0], raw: abuseIpDbRaw, iconRaw: CONNECTOR_ICON_FIXTURE },
        { ...manifest.connectors[1], raw: oktaRaw },
      ],
      sourceUrl: 'http://catalog.test',
      fetchedAt: '2026-08-23T00:00:00.000Z',
    };
    const storage = createStorage();
    storage.get.mockResolvedValue({
      _source: {
        catalog: storedCatalog,
        updated_at: storedCatalog.fetchedAt,
      },
    } as never);
    nock('http://catalog.test').get('/catalog.json').reply(503);

    const service = createService();
    service.start(storage);
    const spec = await service.getSpec('.declarative-abuseipdb', '1.0.0');

    expect(spec?.metadata.id).toBe('.declarative-abuseipdb');
    expect(service.getHealth()).toEqual(
      expect.objectContaining({
        ready: true,
        activeCatalogVersion: 'last-known-good',
        lastError: expect.objectContaining({
          message: expect.stringContaining('HTTP 503'),
        }),
      })
    );
    expect(storage.index).not.toHaveBeenCalled();
    service.stop();
  });

  it('activates a refreshed version while retaining the pinned version', async () => {
    const storage = createStorage();
    const updatedRaw = abuseIpDbRaw
      .replace('version: 1.0.0', 'version: 1.1.0')
      .replace('path: 1.0.0.svg', 'path: 1.1.0.svg');
    const updatedManifest = {
      ...manifest,
      catalogVersion: 'updated-catalog',
      activeVersions: {
        ...manifest.activeVersions,
        '.declarative-abuseipdb': '1.1.0',
      },
      connectors: [
        manifest.connectors[0],
        {
          ...manifest.connectors[0],
          version: '1.1.0',
          definitionUrl: 'connectors/abuseipdb/1.1.0.yaml',
          contentHash: contentHash(updatedRaw),
        },
        manifest.connectors[1],
      ],
    };
    nock('http://catalog.test')
      .get('/catalog.json')
      .reply(200, manifest)
      .get('/connectors/abuseipdb/1.0.0.yaml')
      .reply(200, abuseIpDbRaw)
      .get('/connectors/abuseipdb/1.0.0.svg')
      .reply(200, CONNECTOR_ICON_FIXTURE)
      .get('/connectors/okta/1.0.0.yaml')
      .reply(200, oktaRaw)
      .get('/catalog.json')
      .reply(200, updatedManifest)
      .get('/connectors/abuseipdb/1.0.0.yaml')
      .reply(200, abuseIpDbRaw)
      .get('/connectors/abuseipdb/1.0.0.svg')
      .reply(200, CONNECTOR_ICON_FIXTURE)
      .get('/connectors/abuseipdb/1.1.0.yaml')
      .reply(200, updatedRaw)
      .get('/connectors/abuseipdb/1.1.0.svg')
      .reply(200, CONNECTOR_ICON_FIXTURE)
      .get('/connectors/okta/1.0.0.yaml')
      .reply(200, oktaRaw);

    const service = createService();
    service.start(storage);
    await service.getSpec('.declarative-abuseipdb');
    await service.refresh();

    expect((await service.getSpec('.declarative-abuseipdb'))?.version).toBe('1.1.0');
    expect((await service.getSpec('.declarative-abuseipdb', '1.0.0'))?.version).toBe('1.0.0');
    expect(storage.index).toHaveBeenLastCalledWith({
      id: 'active',
      document: {
        catalog: expect.objectContaining({
          activeVersions: expect.objectContaining({
            '.declarative-abuseipdb': '1.1.0',
          }),
          specifications: expect.arrayContaining([
            expect.objectContaining({ id: '.declarative-abuseipdb', version: '1.0.0' }),
            expect.objectContaining({ id: '.declarative-abuseipdb', version: '1.1.0' }),
          ]),
        }),
        updated_at: expect.any(String),
      },
    });
    service.stop();
  });

  it('rejects a body whose hash does not match the catalog', async () => {
    const storage = createStorage();
    nock('http://catalog.test')
      .get('/catalog.json')
      .reply(200, {
        ...manifest,
        connectors: [{ ...manifest.connectors[0], contentHash: `sha256:${'0'.repeat(64)}` }],
      })
      .get('/connectors/abuseipdb/1.0.0.yaml')
      .reply(200, abuseIpDbRaw);

    const service = createService();
    service.start(storage);
    const spec = await service.getSpec('.declarative-abuseipdb', '1.0.0');

    expect(spec).toBeUndefined();
    expect(storage.index).not.toHaveBeenCalled();
    expect(service.getHealth().lastError?.message).toContain('Integrity check failed');
    service.stop();
  });

  it('rejects catalog metadata that differs from registration metadata', async () => {
    const storage = createStorage();
    const mismatchedRaw = abuseIpDbRaw.replace(
      'displayName: AbuseIPDB',
      'displayName: Unexpected AbuseIPDB'
    );
    nock('http://catalog.test')
      .get('/catalog.json')
      .reply(200, {
        ...manifest,
        connectors: [
          {
            ...manifest.connectors[0],
            contentHash: contentHash(mismatchedRaw),
          },
        ],
      })
      .get('/connectors/abuseipdb/1.0.0.yaml')
      .reply(200, mismatchedRaw);

    const service = createService();
    service.start(storage);
    const spec = await service.getSpec('.declarative-abuseipdb', '1.0.0');

    expect(spec).toBeUndefined();
    expect(storage.index).not.toHaveBeenCalled();
    expect(service.getHealth().lastError?.message).toContain(
      'does not match its registered metadata'
    );
    service.stop();
  });
});
