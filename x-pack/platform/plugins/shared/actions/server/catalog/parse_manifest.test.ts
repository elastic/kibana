/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { createLogOnce } from './log_once';
import { parseCatalogManifest } from './parse_manifest';

const HASH = `sha256:${'a'.repeat(64)}`;

const manifest = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  catalogVersion: 'catalog-1',
  sequence: 1,
  typeMetadata: {
    '.abuseipdb': {
      displayName: 'AbuseIPDB',
      description: 'Test connector',
      minimumLicense: 'gold',
      supportedFeatureIds: ['workflows'],
      extraMetadata: true,
    },
  },
  connectors: [
    {
      id: '.abuseipdb',
      version: '1.0',
      definitionUrl: 'connectors/abuseipdb/1.0.yaml',
      contentHash: HASH,
    },
  ],
  unexpected: 'ignored',
  ...overrides,
});

describe('parseCatalogManifest', () => {
  const logger = loggerMock.create();
  const logOnce = () => createLogOnce(logger);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('parses a valid manifest and ignores unknown fields', () => {
    const parsed = parseCatalogManifest(manifest(), logOnce());
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.sequence).toBe(1);
    expect(parsed.connectors).toHaveLength(1);
    expect(parsed.typeMetadata['.abuseipdb'].displayName).toBe('AbuseIPDB');
    expect(parsed).not.toHaveProperty('unexpected');
    expect(parsed.typeMetadata['.abuseipdb']).not.toHaveProperty('extraMetadata');
  });

  it('skips a row with a bad version', () => {
    const parsed = parseCatalogManifest(
      manifest({
        connectors: [
          {
            id: '.abuseipdb',
            version: '1.0.0',
            definitionUrl: 'connectors/abuseipdb/1.0.yaml',
            contentHash: HASH,
          },
          {
            id: '.abuseipdb',
            version: '1.0',
            definitionUrl: 'connectors/abuseipdb/1.0.yaml',
            contentHash: HASH,
          },
        ],
      }),
      logOnce()
    );
    expect(parsed.connectors).toEqual([
      expect.objectContaining({ id: '.abuseipdb', version: '1.0' }),
    ]);
    expect(logger.warn).toHaveBeenCalled();
  });

  it('skips a row whose id has no metadata', () => {
    const parsed = parseCatalogManifest(
      manifest({
        connectors: [
          {
            id: '.okta',
            version: '1.0',
            definitionUrl: 'connectors/okta/1.0.yaml',
            contentHash: HASH,
          },
          {
            id: '.abuseipdb',
            version: '1.0',
            definitionUrl: 'connectors/abuseipdb/1.0.yaml',
            contentHash: HASH,
          },
        ],
      }),
      logOnce()
    );
    expect(parsed.connectors.map((row) => row.id)).toEqual(['.abuseipdb']);
  });

  it('rejects invalid license metadata by skipping it', () => {
    expect(() =>
      parseCatalogManifest(
        manifest({
          typeMetadata: {
            '.abuseipdb': {
              displayName: 'AbuseIPDB',
              description: 'Test connector',
              minimumLicense: 'not-a-license',
              supportedFeatureIds: ['workflows'],
            },
          },
        }),
        logOnce()
      )
    ).toThrow(/no usable connector rows/);
  });

  it('throws when no rows remain', () => {
    expect(() =>
      parseCatalogManifest(
        manifest({
          connectors: [
            {
              id: '.abuseipdb',
              version: 'bad',
              definitionUrl: 'connectors/abuseipdb/1.0.yaml',
              contentHash: HASH,
            },
          ],
        }),
        logOnce()
      )
    ).toThrow(/no usable connector rows/);
  });

  it('throws when sequence is missing', () => {
    const value = manifest();
    delete (value as { sequence?: number }).sequence;
    expect(() => parseCatalogManifest(value, logOnce())).toThrow(/sequence/);
  });
});
