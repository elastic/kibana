/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ConnectorCatalogStorage } from './catalog_storage';
import { getContentHash } from './icon';
import { ABUSE_IPDB_SPEC_FIXTURE } from './test_fixtures';
import { SpecVersionLoader } from './version_loader';

const V2_YAML = ABUSE_IPDB_SPEC_FIXTURE.replace('version: "1.0"', 'version: "1.1"');

const createStorage = (
  overrides: Partial<jest.Mocked<ConnectorCatalogStorage>> = {}
): jest.Mocked<ConnectorCatalogStorage> =>
  ({
    getDefinition: jest.fn().mockResolvedValue(undefined),
    putDefinitionCreate: jest.fn().mockResolvedValue('created'),
    ...overrides,
  } as unknown as jest.Mocked<ConnectorCatalogStorage>);

describe('SpecVersionLoader', () => {
  it('materializes from the index when the definition exists', async () => {
    const storage = createStorage({
      getDefinition: jest.fn().mockResolvedValue({
        id: '.abuseipdb',
        version: '1.1',
        yaml: V2_YAML,
        contentHash: getContentHash(V2_YAML),
        catalogVersion: 'sha256:aa',
        addedAt: '2026-09-18T00:00:00.000Z',
      }),
    });
    const loader = new SpecVersionLoader({ logger: loggerMock.create() });
    loader.setStorage(storage);

    const materialized = await loader.load('.abuseipdb', '1.1');

    expect(materialized.version).toBe('1.1');
    expect(materialized.id).toBe('.abuseipdb');
    expect(storage.getDefinition).toHaveBeenCalledWith('.abuseipdb', '1.1');
  });

  it('fails without contacting anything when the definition is not in the index', async () => {
    const storage = createStorage();
    const loader = new SpecVersionLoader({ logger: loggerMock.create() });
    loader.setStorage(storage);

    await expect(loader.load('.abuseipdb', '9.9.9')).rejects.toThrow(
      'Spec definition:.abuseipdb@9.9.9 is not stored in the index'
    );
    expect(storage.putDefinitionCreate).not.toHaveBeenCalled();
  });

  it('fails without contacting anything when storage is not ready', async () => {
    const loader = new SpecVersionLoader({ logger: loggerMock.create() });

    await expect(loader.load('.abuseipdb', '1.1')).rejects.toThrow(
      'Spec definition:.abuseipdb@1.1 is not stored in the index'
    );
  });

  it('shares one in-flight promise per id@version', async () => {
    let resolveDefinition: (value: unknown) => void = () => {};
    const storage = createStorage({
      getDefinition: jest.fn(
        async (_id: string, _version: string) =>
          new Promise((resolve) => {
            resolveDefinition = resolve as (value: unknown) => void;
          })
      ) as jest.Mocked<ConnectorCatalogStorage>['getDefinition'],
    });
    const loader = new SpecVersionLoader({ logger: loggerMock.create() });
    loader.setStorage(storage);

    const first = loader.load('.abuseipdb', '1.1');
    const second = loader.load('.abuseipdb', '1.1');
    resolveDefinition({
      id: '.abuseipdb',
      version: '1.1',
      yaml: V2_YAML,
      contentHash: getContentHash(V2_YAML),
      catalogVersion: 'sha256:aa',
      addedAt: '2026-09-18T00:00:00.000Z',
    });

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toBe(secondResult);
    expect(storage.getDefinition).toHaveBeenCalledTimes(1);
  });
});
