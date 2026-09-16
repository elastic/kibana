/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { ConnectorSpecSource, type RawConnectorSpecAsset } from './spec_source';

const MAX_SPEC_BYTES = 256 * 1024;
const MAX_ICON_BYTES = 64 * 1024;

const assertFileSize = (filePath: string, maxBytes: number): void => {
  const { size } = statSync(filePath);
  if (size > maxBytes) {
    throw new Error(
      `Declarative connector file "${filePath}" exceeds the ${maxBytes} byte limit (${size} bytes).`
    );
  }
};

/**
 * Reads `*.yaml` files and optional same-basename `.svg` siblings from a
 * directory. Does not parse YAML.
 */
export class FsSpecReader extends ConnectorSpecSource {
  constructor(private readonly specsDir = path.join(__dirname, 'specs')) {
    super();
  }

  public loadRawSpecs(): RawConnectorSpecAsset[] {
    const entries = readdirSync(this.specsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.yaml'))
      .sort((left, right) => left.name.localeCompare(right.name));

    return entries.map((entry) => {
      const yamlPath = path.join(this.specsDir, entry.name);
      assertFileSize(yamlPath, MAX_SPEC_BYTES);
      const asset: RawConnectorSpecAsset = {
        yamlPath,
        yaml: readFileSync(yamlPath, 'utf8'),
      };

      const iconPath = path.join(this.specsDir, `${path.basename(entry.name, '.yaml')}.svg`);
      try {
        assertFileSize(iconPath, MAX_ICON_BYTES);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return asset;
        }
        throw error;
      }

      asset.iconPath = iconPath;
      asset.icon = readFileSync(iconPath, 'utf8');
      return asset;
    });
  }
}
