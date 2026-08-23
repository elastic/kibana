/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import nock from 'nock';
import { loggerMock } from '@kbn/logging-mocks';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { DeclarativeConnectorCatalogService } from './catalog_service';
import { ABUSE_IPDB_SPEC_FIXTURE, OKTA_SPEC_FIXTURE } from './test_fixtures';
import type { StoredDeclarativeCatalog } from './types';

const abuseIpDbRaw = ABUSE_IPDB_SPEC_FIXTURE;
const oktaRaw = OKTA_SPEC_FIXTURE;
const contentHash = (raw: string): string =>
  `sha256:${createHash('sha256').update(raw, 'utf8').digest('hex')}`;

const manifest = {
  schemaVersion: 1,
  catalogVersion: 'test-catalog',
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
    supportedConnectorIds: ['.declarative-abuseipdb', '.declarative-okta'],
    logger: loggerMock.create(),
  });

describe('DeclarativeConnectorCatalogService', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('validates, persists, and activates a complete catalog atomically', async () => {
    const repository = savedObjectsRepositoryMock.create();
    repository.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('declarative_connector_catalog', 'active')
    );
    repository.create.mockResolvedValue({} as never);
    nock('http://catalog.test')
      .get('/catalog.json')
      .reply(200, manifest)
      .get('/connectors/abuseipdb/1.0.0.yaml')
      .reply(200, abuseIpDbRaw)
      .get('/connectors/okta/1.0.0.yaml')
      .reply(200, oktaRaw);

    const service = createService();
    service.start(repository);
    const spec = await service.getSpec('.declarative-okta', '1.0.0');

    expect(spec?.metadata.id).toBe('.declarative-okta');
    expect(spec?.version).toBe('1.0.0');
    expect(repository.create).toHaveBeenCalledWith(
      'declarative_connector_catalog',
      expect.objectContaining({
        catalogVersion: 'test-catalog',
        activeVersions: {
          '.declarative-abuseipdb': '1.0.0',
          '.declarative-okta': '1.0.0',
        },
      }),
      { id: 'active', overwrite: true }
    );
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
        { ...manifest.connectors[0], raw: abuseIpDbRaw },
        { ...manifest.connectors[1], raw: oktaRaw },
      ],
      sourceUrl: 'http://catalog.test',
      fetchedAt: '2026-08-23T00:00:00.000Z',
    };
    const repository = savedObjectsRepositoryMock.create();
    repository.get.mockResolvedValue({
      id: 'active',
      type: 'declarative_connector_catalog',
      references: [],
      attributes: storedCatalog,
    } as never);
    nock('http://catalog.test').get('/catalog.json').reply(503);

    const service = createService();
    service.start(repository);
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
    expect(repository.create).not.toHaveBeenCalled();
    service.stop();
  });

  it('activates a refreshed version while retaining the pinned version', async () => {
    const repository = savedObjectsRepositoryMock.create();
    repository.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('declarative_connector_catalog', 'active')
    );
    repository.create.mockResolvedValue({} as never);
    const updatedRaw = abuseIpDbRaw.replace('version: 1.0.0', 'version: 1.1.0');
    const updatedManifest = {
      ...manifest,
      catalogVersion: 'updated-catalog',
      connectors: [
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
      .get('/connectors/okta/1.0.0.yaml')
      .reply(200, oktaRaw)
      .get('/catalog.json')
      .reply(200, updatedManifest)
      .get('/connectors/abuseipdb/1.1.0.yaml')
      .reply(200, updatedRaw)
      .get('/connectors/okta/1.0.0.yaml')
      .reply(200, oktaRaw);

    const service = createService();
    service.start(repository);
    await service.getSpec('.declarative-abuseipdb');
    await service.refresh();

    expect((await service.getSpec('.declarative-abuseipdb'))?.version).toBe('1.1.0');
    expect((await service.getSpec('.declarative-abuseipdb', '1.0.0'))?.version).toBe('1.0.0');
    expect(repository.create).toHaveBeenLastCalledWith(
      'declarative_connector_catalog',
      expect.objectContaining({
        activeVersions: expect.objectContaining({
          '.declarative-abuseipdb': '1.1.0',
        }),
        specifications: expect.arrayContaining([
          expect.objectContaining({ id: '.declarative-abuseipdb', version: '1.0.0' }),
          expect.objectContaining({ id: '.declarative-abuseipdb', version: '1.1.0' }),
        ]),
      }),
      { id: 'active', overwrite: true }
    );
    service.stop();
  });

  it('rejects a body whose hash does not match the catalog', async () => {
    const repository = savedObjectsRepositoryMock.create();
    repository.get.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('declarative_connector_catalog', 'active')
    );
    nock('http://catalog.test')
      .get('/catalog.json')
      .reply(200, {
        ...manifest,
        connectors: [{ ...manifest.connectors[0], contentHash: `sha256:${'0'.repeat(64)}` }],
      })
      .get('/connectors/abuseipdb/1.0.0.yaml')
      .reply(200, abuseIpDbRaw);

    const service = createService();
    service.start(repository);
    const spec = await service.getSpec('.declarative-abuseipdb', '1.0.0');

    expect(spec).toBeUndefined();
    expect(repository.create).not.toHaveBeenCalled();
    expect(service.getHealth().lastError?.message).toContain('Integrity check failed');
    service.stop();
  });
});
