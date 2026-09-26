/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { parseCatalogManifest } from './parse_manifest';
import { LIVE_CATALOG_MANIFEST } from './test_fixtures';

const logger = loggerMock.create();

const validManifest = () => JSON.parse(LIVE_CATALOG_MANIFEST) as Record<string, unknown>;

describe('parseCatalogManifest', () => {
  beforeEach(() => {
    loggerMock.clear(logger);
  });

  it('parses the live catalog.json bytes', () => {
    const manifest = parseCatalogManifest(validManifest(), logger);

    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.sequence).toBe(1);
    expect(manifest.typeMetadata['.abuseipdb']?.minimumLicense).toBe('gold');
    expect(manifest.typeMetadata['.okta']?.minimumLicense).toBe('enterprise');
    expect(manifest.connectors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: '.abuseipdb', version: '1.1' }),
        expect.objectContaining({ id: '.okta', version: '1.0' }),
      ])
    );
  });

  it('ignores unknown root fields', () => {
    expect(() =>
      parseCatalogManifest({ ...validManifest(), unexpected: true }, logger)
    ).not.toThrow();
  });

  it('skips one bad typeMetadata id and keeps the others', () => {
    const raw = validManifest();
    const typeMetadata = {
      ...(raw.typeMetadata as Record<string, unknown>),
      '.broken': { displayName: 'Broken' },
    };
    raw.typeMetadata = typeMetadata;
    (raw.connectors as Array<Record<string, unknown>>).push({
      id: '.broken',
      version: '1.0',
      definitionUrl: 'connectors/broken/1.0.yaml',
      contentHash: `sha256:${'a'.repeat(64)}`,
    });

    const manifest = parseCatalogManifest(raw, logger);
    expect(manifest.skippedTypeMetadata).toEqual(['.broken']);
    expect(manifest.typeMetadata['.broken']).toBeUndefined();
    expect(manifest.connectors.find((row) => row.id === '.broken')).toBeUndefined();
    expect(manifest.typeMetadata['.abuseipdb']).toBeDefined();
  });

  it('requires sequence', () => {
    const raw = validManifest();
    delete raw.sequence;
    expect(() => parseCatalogManifest(raw, logger)).toThrow(
      'Declarative connector catalog is invalid'
    );
  });

  it('rejects a non x.y row version', () => {
    const raw = validManifest();
    (raw.connectors as Array<Record<string, unknown>>)[0].version = '1.0.0';
    const manifest = parseCatalogManifest(raw, logger);
    expect(manifest.connectors.find((row) => row.version === '1.0.0')).toBeUndefined();
  });
});
