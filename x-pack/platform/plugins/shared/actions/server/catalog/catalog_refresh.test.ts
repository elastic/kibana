/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { runCatalogRefresh } from './catalog_refresh';
import { createLogOnce } from './log_once';
import { CATALOG_PUBLIC_KEYS } from './keys/catalog_public_keys';
import { definitionDocId } from './catalog_storage';
import {
  ABUSE_IPDB_SPEC_FIXTURE,
  LIVE_CATALOG_MANIFEST,
  LIVE_CATALOG_SIGNATURE,
  LIVE_ABUSEIPDB_1_0_YAML,
  LIVE_ABUSEIPDB_1_1_YAML,
  LIVE_ABUSEIPDB_ICON,
  LIVE_OKTA_1_0_YAML,
  LIVE_OKTA_ICON,
  signedManifestFixture,
} from './test_fixtures';
import type { CatalogSource } from './types';
import type { ConnectorCatalogStorage } from './catalog_storage';

const files: Record<string, string> = {
  'connectors/abuseipdb/1.1.yaml': LIVE_ABUSEIPDB_1_1_YAML,
  'connectors/abuseipdb/1.0.yaml': LIVE_ABUSEIPDB_1_0_YAML,
  'connectors/okta/1.0.yaml': LIVE_OKTA_1_0_YAML,
  'connectors/abuseipdb/icons/sha256:c2ed2c5ebe15e0b513f760b11b0bdd149236d298f06612f468368901ce19e012.svg':
    LIVE_ABUSEIPDB_ICON,
  'connectors/okta/icons/sha256:61285080a6b979ac58e3a9f3c07ed506ee9075db01bd088bfdeaa1a57bdb9f84.svg':
    LIVE_OKTA_ICON,
  'connectors/abuseipdb/1.0.yaml-inline': ABUSE_IPDB_SPEC_FIXTURE,
};

const liveSource = (): CatalogSource => ({
  origin: 'http://127.0.0.1:8090',
  readManifest: async () => ({ bytes: LIVE_CATALOG_MANIFEST, signature: LIVE_CATALOG_SIGNATURE }),
  readText: async (path) => {
    const body = files[path];
    if (body === undefined) {
      throw new Error(`missing ${path}`);
    }
    return body;
  },
});

const createStorage = (): jest.Mocked<ConnectorCatalogStorage> =>
  ({
    getManifest: jest.fn().mockResolvedValue(undefined),
    putManifest: jest.fn().mockResolvedValue('replaced'),
    listDefinitions: jest.fn().mockResolvedValue([]),
    existsDefinitions: jest.fn().mockResolvedValue(new Set()),
    putDefinitionCreate: jest.fn().mockResolvedValue('created'),
    getAssets: jest.fn().mockResolvedValue(new Map()),
    putAssetCreate: jest.fn().mockResolvedValue('created'),
    getDefinition: jest.fn(),
    getDefinitions: jest.fn(),
    getAsset: jest.fn(),
  } as unknown as jest.Mocked<ConnectorCatalogStorage>);

describe('runCatalogRefresh', () => {
  const logger = loggerMock.create();

  it('stops before parse when the signature is invalid', async () => {
    const storage = createStorage();
    const reload = jest.fn();
    await runCatalogRefresh({
      source: {
        origin: 'http://example.test',
        readManifest: async () => ({ bytes: LIVE_CATALOG_MANIFEST, signature: 'not-a-sig' }),
        readText: async () => '',
      },
      storage,
      publicKeys: CATALOG_PUBLIC_KEYS,
      logger,
      logOnce: createLogOnce(logger),
      reload,
    });
    expect(storage.putDefinitionCreate).not.toHaveBeenCalled();
    expect(storage.putManifest).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('short-circuits when the manifest bytes are unchanged and every row exists', async () => {
    const storage = createStorage();
    storage.getManifest.mockResolvedValue({
      bytes: LIVE_CATALOG_MANIFEST,
      signature: LIVE_CATALOG_SIGNATURE,
      sequence: 1,
      catalogVersion: 'sha256:aa',
      fetchedAt: '2026-09-17T12:00:00.000Z',
    });
    storage.existsDefinitions.mockResolvedValue(
      new Set([
        definitionDocId('.abuseipdb', '1.1'),
        definitionDocId('.abuseipdb', '1.0'),
        definitionDocId('.okta', '1.0'),
      ])
    );
    const reload = jest.fn();
    await runCatalogRefresh({
      source: liveSource(),
      storage,
      publicKeys: CATALOG_PUBLIC_KEYS,
      logger,
      logOnce: createLogOnce(logger),
      reload,
    });
    expect(storage.putManifest).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('stores definitions and assets then replaces the manifest and reloads', async () => {
    const storage = createStorage();
    const reload = jest.fn();
    await runCatalogRefresh({
      source: liveSource(),
      storage,
      publicKeys: CATALOG_PUBLIC_KEYS,
      logger,
      logOnce: createLogOnce(logger),
      reload,
    });
    expect(storage.putDefinitionCreate).toHaveBeenCalledTimes(3);
    expect(storage.putAssetCreate).toHaveBeenCalledTimes(2);
    expect(storage.putManifest).toHaveBeenCalledWith(
      expect.objectContaining({ sequence: 1, signature: LIVE_CATALOG_SIGNATURE }),
      undefined
    );
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not replace the manifest on a lower sequence', async () => {
    const storage = createStorage();
    storage.getManifest.mockResolvedValue({
      bytes: '{"not":"the same"}',
      signature: 'old',
      sequence: 9,
      catalogVersion: 'sha256:old',
      fetchedAt: '2026-09-17T12:00:00.000Z',
    });
    const reload = jest.fn();
    await runCatalogRefresh({
      source: liveSource(),
      storage,
      publicKeys: CATALOG_PUBLIC_KEYS,
      logger,
      logOnce: createLogOnce(logger),
      reload,
    });
    expect(storage.putManifest).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('skips a stored id@version whose hash changed', async () => {
    const { bytes, signature } = signedManifestFixture();
    const storage = createStorage();
    storage.listDefinitions.mockResolvedValue([
      {
        id: '.abuseipdb',
        version: '1.0',
        contentHash: `sha256:${'0'.repeat(64)}`,
      },
    ]);
    await runCatalogRefresh({
      source: {
        origin: 'http://example.test',
        readManifest: async () => ({ bytes, signature }),
        readText: async () => ABUSE_IPDB_SPEC_FIXTURE,
      },
      storage,
      publicKeys: CATALOG_PUBLIC_KEYS,
      logger,
      logOnce: createLogOnce(logger),
      reload: jest.fn(),
    });
    expect(storage.putDefinitionCreate).not.toHaveBeenCalled();
  });
});
