/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { DeclarativeCatalogManifest } from './types';
import { ConnectorSpecSource, type RawConnectorSpecAsset } from './spec_source';
import { parseDeclarativeCatalogManifest, parseDeclarativeConnectorSpec } from './parse_spec';

const RESERVED_PREFIX = '.declarative-';
const DEFAULT_SNAPSHOT_DIR = path.join(__dirname, 'snapshot');

export class DiskSnapshotSource extends ConnectorSpecSource {
  constructor(private readonly snapshotDir: string = DEFAULT_SNAPSHOT_DIR) {
    super();
  }

  public async loadManifest(): Promise<DeclarativeCatalogManifest> {
    const raw = await fs.readFile(this.resolve('catalog.json'), 'utf8');
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (error) {
      throw new Error('Shipped connector catalog snapshot is not valid JSON.', { cause: error });
    }
    return parseDeclarativeCatalogManifest(parsedJson);
  }

  public async loadRawSpecs(): Promise<RawConnectorSpecAsset[]> {
    const manifest = await this.loadManifest();
    const assets: RawConnectorSpecAsset[] = [];

    for (const entry of manifest.connectors) {
      if (entry.id.startsWith(RESERVED_PREFIX)) {
        continue;
      }
      if (manifest.activeVersions[entry.id] !== entry.version) {
        continue;
      }
      assets.push(await this.loadEntry(entry.definitionUrl));
    }

    return assets;
  }

  /** Reads one exact `id@version` from the snapshot, active or not. Undefined when not listed. */
  public async loadVersion(
    id: string,
    version: string
  ): Promise<RawConnectorSpecAsset | undefined> {
    const manifest = await this.loadManifest();
    const entry = manifest.connectors.find(
      (candidate) => candidate.id === id && candidate.version === version
    );
    if (!entry || entry.id.startsWith(RESERVED_PREFIX)) {
      return undefined;
    }
    return this.loadEntry(entry.definitionUrl);
  }

  private async loadEntry(definitionUrl: string): Promise<RawConnectorSpecAsset> {
    const yamlPath = this.resolve(definitionUrl);
    const yaml = await fs.readFile(yamlPath, 'utf8');
    const parsed = parseDeclarativeConnectorSpec(yaml);
    const asset: RawConnectorSpecAsset = { yamlPath, yaml };

    if (parsed.metadata.icon) {
      const iconPath = this.resolve(path.dirname(definitionUrl), parsed.metadata.icon.path);
      asset.iconPath = iconPath;
      asset.icon = await fs.readFile(iconPath, 'utf8');
    }
    return asset;
  }

  private resolve(...relativeParts: string[]): string {
    const resolved = path.resolve(this.snapshotDir, ...relativeParts);
    const root = path.resolve(this.snapshotDir);
    if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
      throw new Error(`Snapshot path escapes snapshot directory: ${relativeParts.join('/')}`);
    }
    return resolved;
  }
}
