/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ConnectorCatalogStorage } from './catalog_storage';
import { getContentHash } from './icon';
import { ABUSE_IPDB_SPEC_FIXTURE, CONNECTOR_ICON_FIXTURE } from './test_fixtures';
import type { VersionAssetSource } from './version_loader';
import { SpecVersionLoader } from './version_loader';

const V2_YAML = ABUSE_IPDB_SPEC_FIXTURE.replace('version: 1.0.0', 'version: 1.1.0');

const createStorage = (
  overrides: Partial<jest.Mocked<ConnectorCatalogStorage>> = {}
): jest.Mocked<ConnectorCatalogStorage> =>
  ({
    getDefinition: jest.fn().mockResolvedValue(undefined),
    putDefinitionCreate: jest.fn().mockResolvedValue('created'),
    ...overrides,
  } as unknown as jest.Mocked<ConnectorCatalogStorage>);

const asset = { yamlPath: 'abuseipdb/1.1.0.yaml', yaml: V2_YAML, icon: CONNECTOR_ICON_FIXTURE };

const source = (result: typeof asset | undefined | Error): jest.Mocked<VersionAssetSource> => ({
  loadVersion: jest.fn(async (_id: string, _version: string) => {
    if (result instanceof Error) {
      throw result;
    }
    return result;
  }),
});

describe('SpecVersionLoader', () => {
  it('materializes from the index when the definition exists', async () => {
    const storage = createStorage({
      getDefinition: jest.fn().mockResolvedValue({
        id: '.abuseipdb',
        version: '1.1.0',
        yaml: V2_YAML,
        iconSvg: CONNECTOR_ICON_FIXTURE,
        contentHash: getContentHash(V2_YAML),
        addedAt: '2026-09-18T00:00:00.000Z',
      }),
    });
    const registrySource = source(asset);
    const loader = new SpecVersionLoader({ logger: loggerMock.create(), registrySource });
    loader.setStorage(storage);

    const materialized = await loader.load('.abuseipdb', '1.1.0');

    expect(materialized.version).toBe('1.1.0');
    expect(materialized.spec.metadata.id).toBe('.abuseipdb');
    expect(registrySource.loadVersion).not.toHaveBeenCalled();
  });

  it('falls back to the registry on index miss and stores the definition', async () => {
    const storage = createStorage();
    const loader = new SpecVersionLoader({
      logger: loggerMock.create(),
      registrySource: source(asset),
    });
    loader.setStorage(storage);

    const materialized = await loader.load('.abuseipdb', '1.1.0');

    expect(materialized.version).toBe('1.1.0');
    expect(storage.putDefinitionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '.abuseipdb',
        version: '1.1.0',
        yaml: V2_YAML,
        contentHash: getContentHash(V2_YAML),
      })
    );
  });

  it('falls back to the disk snapshot after the registry', async () => {
    const loader = new SpecVersionLoader({
      logger: loggerMock.create(),
      registrySource: source(new Error('connect ECONNREFUSED')),
      diskSource: source(asset),
    });
    loader.setStorage(createStorage());

    await expect(loader.load('.abuseipdb', '1.1.0')).resolves.toEqual(
      expect.objectContaining({ version: '1.1.0' })
    );
  });

  it('fails closed with every failure listed when no source has the version', async () => {
    const loader = new SpecVersionLoader({
      logger: loggerMock.create(),
      registrySource: source(undefined),
      diskSource: source(undefined),
    });
    loader.setStorage(createStorage());

    await expect(loader.load('.abuseipdb', '9.9.9')).rejects.toThrow(
      'Spec definition:.abuseipdb@9.9.9 could not be obtained (index: definition missing; registry: not listed; disk snapshot: not listed).'
    );
  });

  it('rejects a source that returns a different id@version', async () => {
    const loader = new SpecVersionLoader({
      logger: loggerMock.create(),
      registrySource: source(asset),
    });

    await expect(loader.load('.abuseipdb', '1.0.0')).rejects.toThrow(
      'registry: returned .abuseipdb@1.1.0 instead of .abuseipdb@1.0.0'
    );
  });

  it('shares one in-flight promise per id@version', async () => {
    const registrySource = source(asset);
    const loader = new SpecVersionLoader({ logger: loggerMock.create(), registrySource });

    const [first, second] = await Promise.all([
      loader.load('.abuseipdb', '1.1.0'),
      loader.load('.abuseipdb', '1.1.0'),
    ]);

    expect(first).toBe(second);
    expect(registrySource.loadVersion).toHaveBeenCalledTimes(1);
  });
});
