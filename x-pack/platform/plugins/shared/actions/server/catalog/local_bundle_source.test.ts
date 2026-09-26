/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtemp, mkdir, symlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { LocalBundleSource } from './local_bundle_source';
import { LIVE_CATALOG_MANIFEST, LIVE_CATALOG_SIGNATURE } from './test_fixtures';

describe('LocalBundleSource', () => {
  const writeBundle = async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'catalog-bundle-'));
    await writeFile(path.join(root, 'catalog.json'), LIVE_CATALOG_MANIFEST);
    await writeFile(path.join(root, 'catalog.json.sig'), LIVE_CATALOG_SIGNATURE);
    await mkdir(path.join(root, 'connectors/abuseipdb'), { recursive: true });
    await writeFile(path.join(root, 'connectors/abuseipdb/1.0.yaml'), 'id: .abuseipdb\n');
    return root;
  };

  it('reads the catalog layout from disk', async () => {
    const root = await writeBundle();
    const source = new LocalBundleSource({ root });
    const manifest = await source.readManifest();
    expect(manifest.bytes).toBe(LIVE_CATALOG_MANIFEST);
    expect(manifest.signature).toBe(LIVE_CATALOG_SIGNATURE);
    await expect(source.readText('connectors/abuseipdb/1.0.yaml', 1024)).resolves.toBe(
      'id: .abuseipdb\n'
    );
    expect(source.origin).toBe(`file://${path.resolve(root)}`);
  });

  it('rejects path traversal', async () => {
    const root = await writeBundle();
    const source = new LocalBundleSource({ root });
    await expect(source.readText('../secret.yaml', 1024)).rejects.toThrow(
      'escapes the bundle root'
    );
  });

  it('rejects a symlink that leaves the root', async () => {
    const root = await writeBundle();
    const outside = path.join(root, '..', 'outside.yaml');
    await writeFile(outside, 'secret');
    await symlink(outside, path.join(root, 'escape.yaml'));
    const source = new LocalBundleSource({ root });
    await expect(source.readText('escape.yaml', 1024)).rejects.toThrow('escapes the bundle root');
  });
});
