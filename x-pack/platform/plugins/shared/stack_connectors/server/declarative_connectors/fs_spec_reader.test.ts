/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { CONNECTOR_ICON_FIXTURE } from './test_fixtures';
import { FsSpecReader } from './fs_spec_reader';

const YAML_BODY = 'id: .example\n';

describe('FsSpecReader', () => {
  let specsDir: string;

  beforeEach(() => {
    specsDir = mkdtempSync(path.join(tmpdir(), 'fs-spec-reader-'));
  });

  afterEach(() => {
    rmSync(specsDir, { recursive: true, force: true });
  });

  it('reads yaml with a sibling svg', () => {
    const yamlPath = path.join(specsDir, 'example.yaml');
    const iconPath = path.join(specsDir, 'example.svg');
    writeFileSync(yamlPath, YAML_BODY);
    writeFileSync(iconPath, CONNECTOR_ICON_FIXTURE);

    const [asset] = new FsSpecReader(specsDir).loadRawSpecs();

    expect(asset.yamlPath).toBe(yamlPath);
    expect(asset.yaml).toBe(YAML_BODY);
    expect(asset.iconPath).toBe(iconPath);
    expect(asset.icon).toBe(CONNECTOR_ICON_FIXTURE);
  });

  it('reads yaml without a sibling svg', () => {
    const yamlPath = path.join(specsDir, 'example.yaml');
    writeFileSync(yamlPath, YAML_BODY);

    const [asset] = new FsSpecReader(specsDir).loadRawSpecs();

    expect(asset.yamlPath).toBe(yamlPath);
    expect(asset.yaml).toBe(YAML_BODY);
    expect(asset.iconPath).toBeUndefined();
    expect(asset.icon).toBeUndefined();
  });

  it('rejects an oversized yaml file before reading it', () => {
    const yamlPath = path.join(specsDir, 'huge.yaml');
    writeFileSync(yamlPath, Buffer.alloc(256 * 1024 + 1));

    expect(() => new FsSpecReader(specsDir).loadRawSpecs()).toThrow(yamlPath);
  });

  it('rejects an oversized sibling svg before reading it', () => {
    const yamlPath = path.join(specsDir, 'example.yaml');
    const iconPath = path.join(specsDir, 'example.svg');
    writeFileSync(yamlPath, YAML_BODY);
    writeFileSync(iconPath, Buffer.alloc(64 * 1024 + 1));

    expect(() => new FsSpecReader(specsDir).loadRawSpecs()).toThrow(iconPath);
  });

  it('ignores non-yaml files', () => {
    writeFileSync(path.join(specsDir, 'notes.txt'), 'ignore me');
    writeFileSync(path.join(specsDir, 'example.yml'), 'id: .yml\n');
    writeFileSync(path.join(specsDir, 'example.yaml'), YAML_BODY);

    const assets = new FsSpecReader(specsDir).loadRawSpecs();

    expect(assets).toHaveLength(1);
    expect(assets[0].yaml).toBe(YAML_BODY);
  });
});
