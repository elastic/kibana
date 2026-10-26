/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { loggerMock } from '@kbn/logging-mocks';
import { runCatalogRefresh } from './catalog_refresh';
import { selectLatestPerId } from './catalog_loader';
import { createLogOnce } from './log_once';
import { parseCatalogManifest } from './parse_manifest';
import { parseDefinitionHeader } from './parse_definition_header';
import { signCatalogForTests } from './signature';
import {
  createInMemoryCatalogSource,
  createInMemoryStorage,
  createTestSigningKeys,
} from './test_fixtures';

const FIXTURE_DIR = path.join(__dirname, '__fixtures__/publisher_v1');

const readFixtureFiles = (dir: string, root = dir): Map<string, string> => {
  const files = new Map<string, string>();
  for (const entry of readdirSync(dir)) {
    if (entry === 'README.md') {
      continue;
    }
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      for (const [key, value] of readFixtureFiles(full, root)) {
        files.set(key, value);
      }
      continue;
    }
    files.set(path.relative(root, full).split(path.sep).join('/'), readFileSync(full, 'utf8'));
  }
  return files;
};

describe('publisher v1 catalog', () => {
  const files = readFixtureFiles(FIXTURE_DIR);
  const keys = createTestSigningKeys();
  const bytes = files.get('catalog.json');
  if (!bytes) {
    throw new Error('publisher fixture is missing catalog.json');
  }
  const signature = signCatalogForTests(bytes, keys.privateKeyPem);
  files.set('catalog.json.sig', signature);

  it('parses the workflows publisher manifest', () => {
    const manifest = parseCatalogManifest(JSON.parse(bytes), createLogOnce(loggerMock.create()));
    expect(manifest.connectors).toHaveLength(3);
    expect(Object.keys(manifest.typeMetadata).sort()).toEqual(['.abuseipdb', '.okta']);
    expect(manifest.typeMetadata['.abuseipdb'].icon?.path).toContain('sha256-');
    expect(manifest.typeMetadata['.okta'].icon?.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(selectLatestPerId(manifest.connectors).get('.abuseipdb')?.version).toBe('1.1');
  });

  it('refreshes the signed fixture into storage', async () => {
    const source = createInMemoryCatalogSource(files);
    const storage = createInMemoryStorage();
    const result = await runCatalogRefresh({
      source,
      storage,
      publicKeys: [keys.publicKeyPem],
      logOnce: createLogOnce(loggerMock.create()),
      reload: async () => undefined,
    });
    expect(result).toEqual({ outcome: 'replaced', stored: 5 });
    const manifest = await storage.getManifest();
    expect(manifest?.bytes).toBe(bytes);
    const listed = await storage.listDefinitions();
    expect(listed).toHaveLength(3);
    for (const row of listed) {
      const definition = await storage.getDefinition(row.id, row.version);
      expect(parseDefinitionHeader(definition?.yaml ?? '')).toEqual({
        schemaVersion: 1,
        id: row.id,
        version: row.version,
      });
    }
    expect(selectLatestPerId(listed).get('.abuseipdb')?.version).toBe('1.1');
    const assets = await storage.getAssets([
      'sha256:c2ed2c5ebe15e0b513f760b11b0bdd149236d298f06612f468368901ce19e012',
      'sha256:61285080a6b979ac58e3a9f3c07ed506ee9075db01bd088bfdeaa1a57bdb9f84',
    ]);
    expect(assets.size).toBe(2);
  });
});
