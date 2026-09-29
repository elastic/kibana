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
import { getContentHash } from './icon';
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
  TEST_PUBLIC_KEYS,
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

  beforeEach(() => {
    loggerMock.clear(logger);
  });

  it('stops before parse when the signature is invalid', async () => {
    const storage = createStorage();
    const reload = jest.fn();
    await expect(
      runCatalogRefresh({
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
      })
    ).resolves.toEqual({ outcome: 'failed' });
    expect(storage.putDefinitionCreate).not.toHaveBeenCalled();
    expect(storage.putManifest).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Connector catalog signature verification failed')
    );
    expect(logger.error).not.toHaveBeenCalled();
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
    const abuseipdbIconHash =
      'sha256:c2ed2c5ebe15e0b513f760b11b0bdd149236d298f06612f468368901ce19e012';
    const oktaIconHash = 'sha256:61285080a6b979ac58e3a9f3c07ed506ee9075db01bd088bfdeaa1a57bdb9f84';
    storage.getAssets.mockResolvedValue(
      new Map([
        [
          abuseipdbIconHash,
          {
            contentHash: abuseipdbIconHash,
            svg: LIVE_ABUSEIPDB_ICON,
            addedAt: '2026-09-17T12:00:00.000Z',
          },
        ],
        [
          oktaIconHash,
          {
            contentHash: oktaIconHash,
            svg: LIVE_OKTA_ICON,
            addedAt: '2026-09-17T12:00:00.000Z',
          },
        ],
      ])
    );
    const reload = jest.fn();
    await expect(
      runCatalogRefresh({
        source: liveSource(),
        storage,
        publicKeys: CATALOG_PUBLIC_KEYS,
        logger,
        logOnce: createLogOnce(logger),
        reload,
      })
    ).resolves.toEqual({ outcome: 'same' });
    expect(storage.putManifest).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('stores definitions and assets then replaces the manifest and reloads', async () => {
    const storage = createStorage();
    const reload = jest.fn();
    await expect(
      runCatalogRefresh({
        source: liveSource(),
        storage,
        publicKeys: CATALOG_PUBLIC_KEYS,
        logger,
        logOnce: createLogOnce(logger),
        reload,
      })
    ).resolves.toEqual({ outcome: 'replaced' });
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
    await expect(
      runCatalogRefresh({
        source: liveSource(),
        storage,
        publicKeys: CATALOG_PUBLIC_KEYS,
        logger,
        logOnce: createLogOnce(logger),
        reload,
      })
    ).resolves.toEqual({ outcome: 'stale' });
    expect(storage.putManifest).not.toHaveBeenCalled();
    expect(storage.putDefinitionCreate).not.toHaveBeenCalled();
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

  it('warns on the first fetch failure, debugs on repeats, and warns again after a successful fetch', async () => {
    const storage = createStorage();
    const fetchLogger = loggerMock.create();
    const logOnce = createLogOnce(fetchLogger);
    let calls = 0;
    const source: CatalogSource = {
      origin: 'http://example.test',
      readManifest: async () => {
        calls += 1;
        if (calls === 3) {
          return { bytes: LIVE_CATALOG_MANIFEST, signature: LIVE_CATALOG_SIGNATURE };
        }
        throw new Error('network down');
      },
      readText: async (relativePath) => {
        const body = files[relativePath];
        if (body === undefined) {
          throw new Error(`missing ${relativePath}`);
        }
        return body;
      },
    };
    const deps = {
      source,
      storage,
      publicKeys: CATALOG_PUBLIC_KEYS,
      logger: fetchLogger,
      logOnce,
      reload: jest.fn(),
    };

    await expect(runCatalogRefresh(deps)).resolves.toEqual({ outcome: 'failed' });
    await expect(runCatalogRefresh(deps)).resolves.toEqual({ outcome: 'failed' });
    expect(fetchLogger.warn).toHaveBeenCalledTimes(1);
    expect(fetchLogger.debug).toHaveBeenCalledWith(expect.stringContaining('network down'));

    await runCatalogRefresh(deps);
    fetchLogger.warn.mockClear();
    fetchLogger.debug.mockClear();

    await runCatalogRefresh(deps);
    expect(fetchLogger.warn).toHaveBeenCalledTimes(1);
    expect(fetchLogger.warn).toHaveBeenCalledWith(expect.stringContaining('network down'));
  });

  it('ignores an equal sequence with different bytes before downloading', async () => {
    const storage = createStorage();
    storage.getManifest.mockResolvedValue({
      bytes: '{"not":"the same"}',
      signature: 'old',
      sequence: 1,
      catalogVersion: 'sha256:old',
      fetchedAt: '2026-09-17T12:00:00.000Z',
    });
    const reload = jest.fn();
    const source = liveSource();
    const readText = jest.fn(source.readText);
    await expect(
      runCatalogRefresh({
        source: { ...source, readText },
        storage,
        publicKeys: CATALOG_PUBLIC_KEYS,
        logger,
        logOnce: createLogOnce(logger),
        reload,
      })
    ).resolves.toEqual({ outcome: 'stale' });
    expect(readText).not.toHaveBeenCalled();
    expect(storage.putDefinitionCreate).not.toHaveBeenCalled();
    expect(storage.putManifest).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Ignoring connector catalog sequence')
    );
  });

  it('stores missing rows without replacing the manifest and reloads when the bytes are unchanged', async () => {
    const storage = createStorage();
    storage.getManifest.mockResolvedValue({
      bytes: LIVE_CATALOG_MANIFEST,
      signature: LIVE_CATALOG_SIGNATURE,
      sequence: 1,
      catalogVersion: 'sha256:aa',
      fetchedAt: '2026-09-17T12:00:00.000Z',
    });
    storage.existsDefinitions.mockResolvedValue(
      new Set([definitionDocId('.abuseipdb', '1.1'), definitionDocId('.abuseipdb', '1.0')])
    );
    const reload = jest.fn();
    await expect(
      runCatalogRefresh({
        source: liveSource(),
        storage,
        publicKeys: CATALOG_PUBLIC_KEYS,
        logger,
        logOnce: createLogOnce(logger),
        reload,
      })
    ).resolves.toEqual({ outcome: 'same' });
    expect(storage.putDefinitionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ id: '.okta', version: '1.0' })
    );
    expect(storage.putManifest).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not retry reserved-prefix rows', async () => {
    const reservedYaml = ABUSE_IPDB_SPEC_FIXTURE.replace('id: .abuseipdb', 'id: .declarative-foo');
    const { bytes, signature } = signedManifestFixture({
      typeMetadata: {
        '.abuseipdb': {
          displayName: 'AbuseIPDB',
          description: 'Test',
          minimumLicense: 'gold',
          supportedFeatureIds: ['workflows'],
        },
        '.declarative-foo': {
          displayName: 'Reserved',
          description: 'Should not retry',
          minimumLicense: 'gold',
          supportedFeatureIds: ['workflows'],
        },
      },
      connectors: [
        {
          id: '.abuseipdb',
          version: '1.0',
          definitionUrl: 'connectors/abuseipdb/1.0.yaml',
          contentHash: getContentHash(ABUSE_IPDB_SPEC_FIXTURE),
        },
        {
          id: '.declarative-foo',
          version: '1.0',
          definitionUrl: 'connectors/reserved/1.0.yaml',
          contentHash: getContentHash(reservedYaml),
        },
      ],
    });
    const storage = createStorage();
    storage.getManifest.mockResolvedValue({
      bytes,
      signature,
      sequence: 1,
      catalogVersion: 'sha256:test',
      fetchedAt: '2026-09-17T12:00:00.000Z',
    });
    storage.existsDefinitions.mockResolvedValue(new Set([definitionDocId('.abuseipdb', '1.0')]));
    const readText = jest.fn(async () => ABUSE_IPDB_SPEC_FIXTURE);
    const reload = jest.fn();
    await runCatalogRefresh({
      source: {
        origin: 'http://example.test',
        readManifest: async () => ({ bytes, signature }),
        readText,
      },
      storage,
      publicKeys: CATALOG_PUBLIC_KEYS,
      logger,
      logOnce: createLogOnce(logger),
      reload,
    });
    expect(readText).not.toHaveBeenCalled();
    expect(storage.putDefinitionCreate).not.toHaveBeenCalled();
    expect(storage.putManifest).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('verifies the stored manifest before the short-circuit parse', async () => {
    const storage = createStorage();
    storage.getManifest.mockResolvedValue({
      bytes: LIVE_CATALOG_MANIFEST,
      signature: 'not-a-sig',
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
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Stored connector catalog signature verification failed')
    );
    expect(storage.putManifest).toHaveBeenCalled();
    expect(reload).toHaveBeenCalled();
  });

  it('logs signature failure at warn', async () => {
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
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Connector catalog signature verification failed')
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('accepts a manifest signed with the second trusted key', async () => {
    const { bytes, signature } = signedManifestFixture({}, { keyIndex: 1 });
    const storage = createStorage();
    const reload = jest.fn();
    await expect(
      runCatalogRefresh({
        source: {
          origin: 'http://example.test',
          readManifest: async () => ({ bytes, signature }),
          readText: async () => ABUSE_IPDB_SPEC_FIXTURE,
        },
        storage,
        publicKeys: TEST_PUBLIC_KEYS,
        logger,
        logOnce: createLogOnce(logger),
        reload,
      })
    ).resolves.toEqual({ outcome: 'replaced' });
    expect(storage.putDefinitionCreate).toHaveBeenCalled();
    expect(storage.putManifest).toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload when putManifest returns stale', async () => {
    const storage = createStorage();
    storage.putManifest.mockResolvedValue('stale');
    const reload = jest.fn();
    await expect(
      runCatalogRefresh({
        source: liveSource(),
        storage,
        publicKeys: CATALOG_PUBLIC_KEYS,
        logger,
        logOnce: createLogOnce(logger),
        reload,
      })
    ).resolves.toEqual({ outcome: 'stale' });
    expect(reload).not.toHaveBeenCalled();
  });

  it('skips icons when skipIcons is set', async () => {
    const storage = createStorage();
    const reload = jest.fn();
    await expect(
      runCatalogRefresh({
        source: liveSource(),
        storage,
        publicKeys: CATALOG_PUBLIC_KEYS,
        logger,
        logOnce: createLogOnce(logger),
        reload,
        skipIcons: true,
      })
    ).resolves.toEqual({ outcome: 'replaced' });
    expect(storage.putDefinitionCreate).toHaveBeenCalledTimes(3);
    expect(storage.putAssetCreate).not.toHaveBeenCalled();
    expect(storage.putManifest).toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('fetches a missing icon when every row exists and the bytes are unchanged', async () => {
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
    storage.getAssets.mockResolvedValue(new Map());
    const reload = jest.fn();
    await expect(
      runCatalogRefresh({
        source: liveSource(),
        storage,
        publicKeys: CATALOG_PUBLIC_KEYS,
        logger,
        logOnce: createLogOnce(logger),
        reload,
      })
    ).resolves.toEqual({ outcome: 'same' });
    expect(storage.putAssetCreate).toHaveBeenCalledTimes(2);
    expect(storage.putManifest).not.toHaveBeenCalled();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
