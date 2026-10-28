/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { runCatalogRefresh } from './catalog_refresh';
import { createLogOnce } from './log_once';
import { signCatalogForTests } from './signature';
import {
  ABUSEIPDB_1_0_YAML,
  buildTestCatalog,
  createInMemoryCatalogSource,
  createInMemoryStorage,
  createTestSigningKeys,
  SAFE_SVG,
} from './test_fixtures';

const keys = createTestSigningKeys();

const catalog = (sequence = 1) =>
  buildTestCatalog({
    rows: [{ id: '.abuseipdb', version: '1.0', yaml: ABUSEIPDB_1_0_YAML }],
    sequence,
    privateKeyPem: keys.privateKeyPem,
  });

const refresh = (
  files: Map<string, string>,
  storage = createInMemoryStorage(),
  options?: { signal?: AbortSignal; sourceFail?: boolean }
) => {
  const source = createInMemoryCatalogSource(files, { fail: options?.sourceFail });
  const logger = loggerMock.create();
  const logOnce = createLogOnce(logger);
  const reload = jest.fn(async () => undefined);
  const putManifest = jest.spyOn(storage, 'putManifest');
  const result = runCatalogRefresh({
    source,
    storage,
    publicKeys: [keys.publicKeyPem],
    logOnce,
    reload,
    signal: options?.signal,
  });
  return { source, storage, logger, reload, putManifest, result };
};

describe('runCatalogRefresh', () => {
  it('returns failed and writes nothing when fetch throws', async () => {
    const built = catalog();
    const storage = createInMemoryStorage();
    const putManifest = jest.spyOn(storage, 'putManifest');
    const source = createInMemoryCatalogSource(built.files, { fail: true });
    const logger = loggerMock.create();
    const logOnce = createLogOnce(logger);
    const run = () =>
      runCatalogRefresh({
        source,
        storage,
        publicKeys: [keys.publicKeyPem],
        logOnce,
        reload: async () => undefined,
      });
    await expect(run()).resolves.toEqual({ outcome: 'failed', stored: 0 });
    await expect(run()).resolves.toEqual({ outcome: 'failed', stored: 0 });
    expect(putManifest).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.debug).toHaveBeenCalled();
  });

  it('leaves the manifest untouched when the signature is bad', async () => {
    const built = catalog();
    built.files.set('catalog.json.sig', 'bm90LWEtdmFsaWQtc2lnbmF0dXJl');
    const { result, putManifest } = refresh(built.files);
    await expect(result).resolves.toEqual({ outcome: 'failed', stored: 0 });
    expect(putManifest).not.toHaveBeenCalled();
  });

  it('returns failed for invalid JSON and an invalid manifest', async () => {
    const built = catalog();
    built.files.set('catalog.json', '{');
    built.files.set('catalog.json.sig', signCatalogForTests('{', keys.privateKeyPem));
    await expect(refresh(built.files).result).resolves.toEqual({ outcome: 'failed', stored: 0 });

    const invalid = JSON.stringify({ schemaVersion: 1 });
    built.files.set('catalog.json', invalid);
    built.files.set('catalog.json.sig', signCatalogForTests(invalid, keys.privateKeyPem));
    await expect(refresh(built.files).result).resolves.toEqual({ outcome: 'failed', stored: 0 });
  });

  it('returns stale for a lower sequence and does not replace the manifest', async () => {
    const current = catalog(2);
    const older = catalog(1);
    const storage = createInMemoryStorage();
    await storage.putManifest(
      {
        bytes: current.bytes,
        signature: current.signature,
        sequence: 2,
        catalogVersion: current.manifest.catalogVersion,
        fetchedAt: '2026-01-01T00:00:00.000Z',
      },
      undefined
    );
    const { result, putManifest } = refresh(older.files, storage);
    await expect(result).resolves.toEqual({ outcome: 'stale', stored: 0 });
    expect(putManifest).not.toHaveBeenCalled();
    await expect(storage.getManifest()).resolves.toEqual(expect.objectContaining({ sequence: 2 }));
  });

  it('returns same without writes when the bytes and rows are already stored', async () => {
    const built = catalog();
    const first = refresh(built.files);
    await expect(first.result).resolves.toEqual(expect.objectContaining({ outcome: 'replaced' }));
    first.putManifest.mockClear();
    const second = refresh(built.files, first.storage);
    await expect(second.result).resolves.toEqual({ outcome: 'same', stored: 0 });
    expect(first.putManifest).not.toHaveBeenCalled();
    expect(second.reload).not.toHaveBeenCalled();
  });

  it('stores a missing row on the same bytes and reloads', async () => {
    const built = catalog();
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
    const { result, reload } = refresh(built.files, storage);
    await expect(result).resolves.toEqual(expect.objectContaining({ outcome: 'same', stored: 2 }));
    expect(reload).toHaveBeenCalledTimes(1);
    await expect(storage.getDefinition('.abuseipdb', '1.0')).resolves.toEqual(
      expect.objectContaining({ yaml: ABUSEIPDB_1_0_YAML })
    );
  });

  it('fails and leaves the stored manifest unchanged on a row hash mismatch', async () => {
    const built = catalog();
    const definitionUrl = built.manifest.connectors[0].definitionUrl;
    built.files.set(definitionUrl, `${ABUSEIPDB_1_0_YAML}\n# tampered\n`);
    const storage = createInMemoryStorage();
    const { result, putManifest } = refresh(built.files, storage);
    await expect(result).resolves.toEqual({ outcome: 'failed', stored: 0 });
    expect(putManifest).not.toHaveBeenCalled();
    await expect(storage.getManifest()).resolves.toBeUndefined();
  });

  it('fails and leaves the stored manifest unchanged on a header mismatch', async () => {
    const tampered = ABUSEIPDB_1_0_YAML.replace('id: .abuseipdb', 'id: .other');
    const built = buildTestCatalog({
      rows: [{ id: '.abuseipdb', version: '1.0', yaml: tampered }],
      sequence: 1,
      privateKeyPem: keys.privateKeyPem,
    });
    const storage = createInMemoryStorage();
    const { result, putManifest } = refresh(built.files, storage);
    await expect(result).resolves.toEqual({ outcome: 'failed', stored: 0 });
    expect(putManifest).not.toHaveBeenCalled();
    await expect(storage.getManifest()).resolves.toBeUndefined();
  });

  it('fails and leaves the stored manifest unchanged on an icon hash mismatch or unsafe svg', async () => {
    const mismatch = catalog();
    const iconPath = mismatch.manifest.typeMetadata['.abuseipdb'].icon?.path;
    mismatch.files.set(iconPath!, `${SAFE_SVG}<!--changed-->`);
    const mismatchRun = refresh(mismatch.files);
    await expect(mismatchRun.result).resolves.toEqual({ outcome: 'failed', stored: 0 });
    expect(mismatchRun.putManifest).not.toHaveBeenCalled();

    const unsafe = buildTestCatalog({
      rows: [
        {
          id: '.abuseipdb',
          version: '1.0',
          yaml: ABUSEIPDB_1_0_YAML,
          iconSvg: '<svg><script>alert(1)</script></svg>',
        },
      ],
      sequence: 1,
      privateKeyPem: keys.privateKeyPem,
    });
    const unsafeRun = refresh(unsafe.files);
    await expect(unsafeRun.result).resolves.toEqual({ outcome: 'failed', stored: 0 });
    expect(unsafeRun.putManifest).not.toHaveBeenCalled();
  });

  it('stops before remaining rows when the signal is aborted and does not replace the manifest', async () => {
    const built = buildTestCatalog({
      rows: [
        { id: '.abuseipdb', version: '1.0', yaml: ABUSEIPDB_1_0_YAML },
        {
          id: '.okta',
          version: '1.0',
          yaml: ABUSEIPDB_1_0_YAML.replace('id: .abuseipdb', 'id: .okta').replace(
            'version: "1.0"',
            'version: "1.0"'
          ),
        },
      ],
      sequence: 1,
      privateKeyPem: keys.privateKeyPem,
    });
    const controller = new AbortController();
    const source = createInMemoryCatalogSource(built.files);
    const original = source.readText.bind(source);
    source.readText = async (path, maxBytes, signal) => {
      if (path.includes('okta')) {
        controller.abort();
      }
      return original(path, maxBytes, signal);
    };
    const storage = createInMemoryStorage();
    const putManifest = jest.spyOn(storage, 'putManifest');
    const result = await runCatalogRefresh({
      source,
      storage,
      publicKeys: [keys.publicKeyPem],
      logOnce: createLogOnce(loggerMock.create()),
      reload: async () => undefined,
      signal: controller.signal,
    });
    expect(result.outcome).toBe('failed');
    expect(putManifest).not.toHaveBeenCalled();
    expect(source.reads.some((path) => path.includes('icons') && path.includes('okta'))).toBe(
      false
    );
  });
});
