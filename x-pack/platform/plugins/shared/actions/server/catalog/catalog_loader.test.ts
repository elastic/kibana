/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { loadCatalogFromIndex } from './catalog_loader';
import { createLogOnce } from './log_once';
import type { CatalogRegistryDeps, CatalogTypeBuilder, RegisteredCatalogType } from './types';
import { getConnectorType } from '../fixtures';
import {
  ABUSEIPDB_1_0_YAML,
  ABUSEIPDB_1_1_YAML,
  OKTA_1_0_YAML,
  buildTestCatalog,
  createInMemoryStorage,
  createTestSigningKeys,
} from './test_fixtures';

const keys = createTestSigningKeys();

const storeCatalog = async (
  rows: Array<{ id: string; version: string; yaml: string }>,
  options?: { signature?: string }
) => {
  const built = buildTestCatalog({
    rows,
    sequence: 1,
    privateKeyPem: keys.privateKeyPem,
  });
  const storage = createInMemoryStorage();
  await storage.putManifest(
    {
      bytes: built.bytes,
      signature: options?.signature ?? built.signature,
      sequence: 1,
      catalogVersion: built.manifest.catalogVersion,
      fetchedAt: '2026-01-01T00:00:00.000Z',
    },
    undefined
  );
  for (const row of rows) {
    const manifestRow = built.manifest.connectors.find(
      (candidate) => candidate.id === row.id && candidate.version === row.version
    );
    await storage.putDefinitionCreate({
      id: row.id,
      version: row.version,
      yaml: row.yaml,
      contentHash: manifestRow?.contentHash ?? 'sha256:missing',
      catalogVersion: built.manifest.catalogVersion,
      addedAt: '2026-01-01T00:00:00.000Z',
    });
    const icon = built.manifest.typeMetadata[row.id]?.icon;
    if (icon) {
      await storage.putAssetCreate({
        contentHash: icon.contentHash,
        svg: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0h1v1H0z"/></svg>',
        addedAt: '2026-01-01T00:00:00.000Z',
      });
    }
  }
  return { storage, built };
};

const fakeBuilder = (): CatalogTypeBuilder =>
  jest.fn((input) =>
    getConnectorType({
      id: input.id,
      name: input.metadata.displayName,
      minimumLicenseRequired: 'gold',
    })
  );

describe('loadCatalogFromIndex', () => {
  const logger = loggerMock.create();
  const registered = () => new Map<string, RegisteredCatalogType>();
  const registry = (ids = new Set<string>()): CatalogRegistryDeps & { ids: Set<string> } => ({
    ids,
    registerType: jest.fn((type) => {
      ids.add(type.id);
    }),
    isTypeRegistered: (id) => ids.has(id),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds the highest stored version once', async () => {
    const { storage } = await storeCatalog([
      { id: '.abuseipdb', version: '1.0', yaml: ABUSEIPDB_1_0_YAML },
      { id: '.abuseipdb', version: '1.1', yaml: ABUSEIPDB_1_1_YAML },
    ]);
    const buildType = fakeBuilder();
    const reg = registry();
    const result = await loadCatalogFromIndex({
      storage,
      publicKeys: [keys.publicKeyPem],
      registry: reg,
      buildType,
      registered: registered(),
      logger,
      logOnce: createLogOnce(logger),
    });
    expect(buildType).toHaveBeenCalledTimes(1);
    expect(buildType).toHaveBeenCalledWith(
      expect.objectContaining({ id: '.abuseipdb', version: '1.1' })
    );
    expect(result.registered).toBe(1);
  });

  it('leaves an already registered id in place and logs at debug', async () => {
    const { storage } = await storeCatalog([
      { id: '.abuseipdb', version: '1.1', yaml: ABUSEIPDB_1_1_YAML },
    ]);
    const buildType = fakeBuilder();
    const known = registered();
    known.set('.abuseipdb', {
      id: '.abuseipdb',
      version: '1.0',
      contentHash: 'sha256:old',
    });
    const reg = registry(new Set(['.abuseipdb']));
    await loadCatalogFromIndex({
      storage,
      publicKeys: [keys.publicKeyPem],
      registry: reg,
      buildType,
      registered: known,
      logger,
      logOnce: createLogOnce(logger),
    });
    expect(buildType).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('already registered'));
  });

  it('builds a newer version when the registry can accept it', async () => {
    const { storage } = await storeCatalog([
      { id: '.abuseipdb', version: '1.1', yaml: ABUSEIPDB_1_1_YAML },
    ]);
    const buildType = fakeBuilder();
    const known = registered();
    known.set('.abuseipdb', { id: '.abuseipdb', version: '1.0', contentHash: 'sha256:old' });
    await loadCatalogFromIndex({
      storage,
      publicKeys: [keys.publicKeyPem],
      registry: registry(),
      buildType,
      registered: known,
      logger,
      logOnce: createLogOnce(logger),
    });
    expect(buildType).toHaveBeenCalledWith(expect.objectContaining({ version: '1.1' }));
  });

  it('skips an in-tree collision once', async () => {
    const { storage } = await storeCatalog([
      { id: '.abuseipdb', version: '1.0', yaml: ABUSEIPDB_1_0_YAML },
    ]);
    const buildType = fakeBuilder();
    const reg = registry(new Set(['.abuseipdb']));
    const logOnce = createLogOnce(logger);
    const deps = {
      storage,
      publicKeys: [keys.publicKeyPem],
      registry: reg,
      buildType,
      registered: registered(),
      logger,
      logOnce,
    };
    await loadCatalogFromIndex(deps);
    await loadCatalogFromIndex(deps);
    expect(buildType).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
  });

  it('registers nothing when the stored signature is bad', async () => {
    const { storage } = await storeCatalog(
      [{ id: '.abuseipdb', version: '1.0', yaml: ABUSEIPDB_1_0_YAML }],
      { signature: 'bm90LWEtdmFsaWQtc2lnbmF0dXJl' }
    );
    const result = await loadCatalogFromIndex({
      storage,
      publicKeys: [keys.publicKeyPem],
      registry: registry(),
      buildType: fakeBuilder(),
      registered: registered(),
      logger,
      logOnce: createLogOnce(logger),
    });
    expect(result).toEqual({ registered: 0, manifestPresent: true, definitions: 0 });
  });

  it('skips a definition whose hash does not match', async () => {
    const built = buildTestCatalog({
      rows: [{ id: '.abuseipdb', version: '1.0', yaml: ABUSEIPDB_1_0_YAML }],
      sequence: 1,
      privateKeyPem: keys.privateKeyPem,
    });
    const storage = createInMemoryStorage();
    await storage.putManifest(
      {
        bytes: built.bytes,
        signature: built.signature,
        sequence: 1,
        catalogVersion: built.manifest.catalogVersion,
        fetchedAt: '2026-01-01T00:00:00.000Z',
      },
      undefined
    );
    await storage.putDefinitionCreate({
      id: '.abuseipdb',
      version: '1.0',
      yaml: `${ABUSEIPDB_1_0_YAML}# tampered\n`,
      contentHash: built.manifest.connectors[0].contentHash,
      catalogVersion: built.manifest.catalogVersion,
      addedAt: '2026-01-01T00:00:00.000Z',
    });
    const buildType = fakeBuilder();
    const result = await loadCatalogFromIndex({
      storage,
      publicKeys: [keys.publicKeyPem],
      registry: registry(),
      buildType,
      registered: registered(),
      logger,
      logOnce: createLogOnce(logger),
    });
    expect(buildType).not.toHaveBeenCalled();
    expect(result.registered).toBe(0);
  });

  it('skips an id with no metadata', async () => {
    const { storage, built } = await storeCatalog([
      { id: '.abuseipdb', version: '1.0', yaml: ABUSEIPDB_1_0_YAML },
    ]);
    await storage.putDefinitionCreate({
      id: '.okta',
      version: '1.0',
      yaml: OKTA_1_0_YAML,
      contentHash: 'sha256:ignored',
      catalogVersion: built.manifest.catalogVersion,
      addedAt: '2026-01-01T00:00:00.000Z',
    });
    const buildType = fakeBuilder();
    await loadCatalogFromIndex({
      storage,
      publicKeys: [keys.publicKeyPem],
      registry: registry(),
      buildType,
      registered: registered(),
      logger,
      logOnce: createLogOnce(logger),
    });
    expect(buildType).toHaveBeenCalledTimes(1);
    expect(buildType).toHaveBeenCalledWith(expect.objectContaining({ id: '.abuseipdb' }));
  });

  it('counts stored definitions and logs once when no builder is injected', async () => {
    const { storage } = await storeCatalog([
      { id: '.abuseipdb', version: '1.0', yaml: ABUSEIPDB_1_0_YAML },
      { id: '.okta', version: '1.0', yaml: OKTA_1_0_YAML },
    ]);
    const notices = new Set<string>();
    const deps = {
      storage,
      publicKeys: [keys.publicKeyPem],
      registry: registry(),
      registered: registered(),
      logger,
      logOnce: createLogOnce(logger),
      notices,
    };
    const result = await loadCatalogFromIndex(deps);
    await loadCatalogFromIndex(deps);
    expect(result).toEqual({ registered: 0, manifestPresent: true, definitions: 2 });
    expect(logger.info).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      'declarative runtime not available; 2 definitions stored, 0 registered'
    );
  });

  it('continues when registerType throws', async () => {
    const { storage } = await storeCatalog([
      { id: '.abuseipdb', version: '1.0', yaml: ABUSEIPDB_1_0_YAML },
      { id: '.okta', version: '1.0', yaml: OKTA_1_0_YAML },
    ]);
    const reg = registry();
    reg.registerType = jest.fn((type) => {
      if (type.id === '.abuseipdb') {
        throw new Error('insufficient license');
      }
      reg.ids.add(type.id);
    });
    const result = await loadCatalogFromIndex({
      storage,
      publicKeys: [keys.publicKeyPem],
      registry: reg,
      buildType: fakeBuilder(),
      registered: registered(),
      logger,
      logOnce: createLogOnce(logger),
    });
    expect(result.registered).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('insufficient license'));
  });
});
