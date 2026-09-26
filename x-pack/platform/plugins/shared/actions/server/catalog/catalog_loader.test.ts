/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { loadCatalogFromIndex } from './catalog_loader';
import { createLogOnce } from './log_once';
import { CATALOG_PUBLIC_KEYS } from './keys/catalog_public_keys';
import { createVersionedConnectorType } from './versioned_connector_type';
import type { PluginSetupContract as ActionsPluginSetupContract } from '../plugin';
import {
  LIVE_ABUSEIPDB_1_1_YAML,
  LIVE_CATALOG_MANIFEST,
  LIVE_CATALOG_SIGNATURE,
  LIVE_ABUSEIPDB_ICON,
  TYPE_METADATA_FIXTURE,
} from './test_fixtures';
import type { ConnectorCatalogStorage } from './catalog_storage';
import { createConnectorTypeFromSpec } from '../lib/single_file_connectors/create_connector_from_spec';
import { z } from '@kbn/zod/v4';

jest.mock('../lib/single_file_connectors/create_connector_from_spec', () => ({
  createConnectorTypeFromSpec: jest.fn(),
}));

const mockedCreateType = createConnectorTypeFromSpec as jest.MockedFunction<
  typeof createConnectorTypeFromSpec
>;

describe('loadCatalogFromIndex', () => {
  const logger = loggerMock.create();
  const actions = {} as ActionsPluginSetupContract;

  beforeEach(() => {
    mockedCreateType.mockImplementation((spec) => ({
      id: spec.metadata.id,
      name: spec.metadata.displayName,
      minimumLicenseRequired: spec.metadata.minimumLicense,
      supportedFeatureIds: spec.metadata.supportedFeatureIds,
      connectorSpec: spec,
      validate: {
        config: { schema: z.object({}) },
        secrets: { schema: z.object({}) },
        params: { schema: z.object({}) },
      },
      executor: jest.fn(),
    }));
  });

  const createStorage = (): jest.Mocked<ConnectorCatalogStorage> =>
    ({
      getManifest: jest.fn().mockResolvedValue({
        bytes: LIVE_CATALOG_MANIFEST,
        signature: LIVE_CATALOG_SIGNATURE,
        sequence: 1,
        catalogVersion: 'sha256:aa',
        fetchedAt: '2026-09-17T12:00:00.000Z',
      }),
      listDefinitions: jest.fn().mockResolvedValue([
        { id: '.abuseipdb', version: '1.1', contentHash: 'sha256:aa' },
        { id: '.abuseipdb', version: '1.0', contentHash: 'sha256:bb' },
      ]),
      getDefinition: jest.fn(async (_id: string, version: string) => ({
        id: '.abuseipdb',
        version,
        yaml: LIVE_ABUSEIPDB_1_1_YAML.replace('version: "1.1"', `version: "${version}"`),
        contentHash: 'sha256:aa',
        catalogVersion: 'sha256:aa',
        addedAt: '2026-09-17T12:00:00.000Z',
      })),
      getAssets: jest.fn().mockResolvedValue(
        new Map([
          [
            'sha256:c2ed2c5ebe15e0b513f760b11b0bdd149236d298f06612f468368901ce19e012',
            {
              contentHash:
                'sha256:c2ed2c5ebe15e0b513f760b11b0bdd149236d298f06612f468368901ce19e012',
              svg: LIVE_ABUSEIPDB_ICON,
              addedAt: '2026-09-17T12:00:00.000Z',
            },
          ],
        ])
      ),
    } as unknown as jest.Mocked<ConnectorCatalogStorage>);

  it('returns 0 types when the index has no manifest', async () => {
    const storage = createStorage();
    storage.getManifest.mockResolvedValue(undefined);
    const registered: string[] = [];
    const result = await loadCatalogFromIndex({
      storage,
      publicKeys: CATALOG_PUBLIC_KEYS,
      registry: {
        registerType: (type) => registered.push(type.id),
        isTypeRegistered: () => false,
      },
      pinnedClient: {
        find: jest.fn().mockResolvedValue({ aggregations: { types: { buckets: [] } } }),
      },
      buildType: ({ id, versions, metadata }) =>
        createVersionedConnectorType({ id, versions, metadata, actions, logger }),
      types: new Map(),
      logger,
      logOnce: createLogOnce(logger),
    });
    expect(result.registered).toBe(0);
    expect(registered).toEqual([]);
  });

  it('returns 0 types when the stored signature is invalid', async () => {
    const storage = createStorage();
    storage.getManifest.mockResolvedValue({
      bytes: LIVE_CATALOG_MANIFEST,
      signature: 'bad',
      sequence: 1,
      catalogVersion: 'sha256:aa',
      fetchedAt: '2026-09-17T12:00:00.000Z',
    });
    const result = await loadCatalogFromIndex({
      storage,
      publicKeys: CATALOG_PUBLIC_KEYS,
      registry: { registerType: jest.fn(), isTypeRegistered: () => false },
      pinnedClient: {
        find: jest.fn().mockResolvedValue({ aggregations: { types: { buckets: [] } } }),
      },
      buildType: ({ id, versions, metadata }) =>
        createVersionedConnectorType({ id, versions, metadata, actions, logger }),
      types: new Map(),
      logger,
      logOnce: createLogOnce(logger),
    });
    expect(result.registered).toBe(0);
  });

  it('registers a new id and skips an in-tree collision', async () => {
    const storage = createStorage();
    const registered: string[] = [];
    const result = await loadCatalogFromIndex({
      storage,
      publicKeys: CATALOG_PUBLIC_KEYS,
      registry: {
        registerType: (type) => registered.push(type.id),
        isTypeRegistered: (id) => id === '.okta',
      },
      pinnedClient: {
        find: jest.fn().mockResolvedValue({ aggregations: { types: { buckets: [] } } }),
      },
      buildType: ({ id, versions, metadata }) =>
        createVersionedConnectorType({
          id,
          versions,
          metadata: { ...TYPE_METADATA_FIXTURE, ...metadata },
          actions,
          logger,
        }),
      types: new Map(),
      logger,
      logOnce: createLogOnce(logger),
    });
    expect(result.registered).toBe(1);
    expect(registered).toEqual(['.abuseipdb']);
  });
});
