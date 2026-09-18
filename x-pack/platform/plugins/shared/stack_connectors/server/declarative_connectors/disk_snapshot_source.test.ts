/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiskSnapshotSource } from './disk_snapshot_source';
import { parseDeclarativeConnectorSpec } from './parse_spec';

describe('DiskSnapshotSource', () => {
  it('loads active AbuseIPDB and Okta definitions from the shipped snapshot', async () => {
    const source = new DiskSnapshotSource();
    const manifest = await source.loadManifest();
    const assets = await source.loadRawSpecs();

    expect(manifest.activeVersions).toEqual({
      '.abuseipdb': '1.1.0',
      '.okta': '1.0.0',
    });
    expect(assets.map((asset) => parseDeclarativeConnectorSpec(asset.yaml).id).sort()).toEqual([
      '.abuseipdb',
      '.okta',
    ]);
    expect(
      assets.every((asset) => typeof asset.icon === 'string' && asset.icon.includes('<svg'))
    ).toBe(true);
  });

  it('loads one exact id@version and returns undefined for unlisted versions', async () => {
    const source = new DiskSnapshotSource();

    const asset = await source.loadVersion('.okta', '1.0.0');
    expect(asset).toBeDefined();
    expect(parseDeclarativeConnectorSpec(asset!.yaml)).toEqual(
      expect.objectContaining({ id: '.okta', version: '1.0.0' })
    );

    await expect(source.loadVersion('.okta', '9.9.9')).resolves.toBeUndefined();
    await expect(source.loadVersion('.declarative-okta', '1.0.0')).resolves.toBeUndefined();
  });
});
