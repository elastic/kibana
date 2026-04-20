/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';

import {
  parseGsPath,
  titleCase,
  buildEntrySourceDisplayName,
  buildFullyQualifiedName,
  formatShellCommand,
  readAspectData,
  listYamlFilesRecursively,
} from './dataplex_utils';

describe('parseGsPath', () => {
  it('parses a full GCS path into bucket and path', () => {
    expect(parseGsPath('gs://my-bucket/some/path/to/data')).toEqual({
      bucket: 'my-bucket',
      path: 'some/path/to/data',
    });
  });

  it('parses a bucket-only GCS path', () => {
    expect(parseGsPath('gs://my-bucket')).toEqual({
      bucket: 'my-bucket',
      path: '',
    });
  });

  it('handles a trailing slash', () => {
    expect(parseGsPath('gs://my-bucket/')).toEqual({
      bucket: 'my-bucket',
      path: '',
    });
  });

  it('throws for non-gs:// paths', () => {
    expect(() => parseGsPath('s3://bucket/path')).toThrow('Invalid gcs_path');
    expect(() => parseGsPath('/local/path')).toThrow('Invalid gcs_path');
  });
});

describe('titleCase', () => {
  it('converts hyphenated strings', () => {
    expect(titleCase('security-ai')).toBe('Security Ai');
  });

  it('converts underscored strings', () => {
    expect(titleCase('attack_discovery')).toBe('Attack Discovery');
  });

  it('handles single words', () => {
    expect(titleCase('observability')).toBe('Observability');
  });

  it('handles mixed separators', () => {
    expect(titleCase('some-mixed_case')).toBe('Some Mixed Case');
  });
});

describe('buildEntrySourceDisplayName', () => {
  it('builds display name from path with 3+ segments', () => {
    const result = buildEntrySourceDisplayName(
      'gs://my-bucket/security-ai/attack-discovery/run-2026-03-26'
    );
    expect(result).toBe('Security Ai: attack-discovery (run-2026-03-26)');
  });

  it('falls back for paths with fewer than 3 segments', () => {
    const result = buildEntrySourceDisplayName('gs://my-bucket/short');
    expect(result).toBe('ES snapshot dataset: gs://my-bucket/short');
  });

  it('falls back for bucket-only paths', () => {
    const result = buildEntrySourceDisplayName('gs://my-bucket');
    expect(result).toBe('ES snapshot dataset: gs://my-bucket');
  });
});

describe('buildFullyQualifiedName', () => {
  it('builds FQN from GCS path', () => {
    expect(buildFullyQualifiedName('gs://my-bucket/security-ai/attack-discovery/run-1')).toBe(
      'custom:es-snapshots.my-bucket.security-ai.attack-discovery.run-1'
    );
  });

  it('handles bucket-only path', () => {
    expect(buildFullyQualifiedName('gs://my-bucket')).toBe('custom:es-snapshots.my-bucket');
  });
});

describe('formatShellCommand', () => {
  it('joins simple args without quoting', () => {
    expect(formatShellCommand(['gcloud', 'dataplex', 'entries', 'create', 'my-entry'])).toBe(
      'gcloud dataplex entries create my-entry'
    );
  });

  it('quotes args with spaces', () => {
    expect(formatShellCommand(['gcloud', '--display-name', 'My Display Name'])).toBe(
      "gcloud --display-name 'My Display Name'"
    );
  });

  it('handles args with special characters', () => {
    expect(formatShellCommand(['--key', 'value=foo,bar'])).toBe('--key value=foo,bar');
  });
});

describe('readAspectData', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'dataplex-test-'));
  });

  afterEach(() => {
    Fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reads valid YAML aspect data', () => {
    const yamlContent = `
es_snapshot_metadata:
  data:
    gcs_path: gs://my-bucket/security-ai/attack-discovery/run-1
    description: Test snapshot
    team: security-ai
`;
    const filePath = Path.join(tmpDir, 'test-entry.yaml');
    Fs.writeFileSync(filePath, yamlContent);

    const result = readAspectData(filePath);
    expect(result).toEqual({
      gcs_path: 'gs://my-bucket/security-ai/attack-discovery/run-1',
      description: 'Test snapshot',
      team: 'security-ai',
    });
  });

  it('returns undefined for missing optional fields', () => {
    const yamlContent = `
es_snapshot_metadata:
  data:
    gcs_path: gs://my-bucket/data
`;
    const filePath = Path.join(tmpDir, 'minimal.yaml');
    Fs.writeFileSync(filePath, yamlContent);

    const result = readAspectData(filePath);
    expect(result).toEqual({
      gcs_path: 'gs://my-bucket/data',
      description: undefined,
      team: undefined,
    });
  });

  it('throws for missing gcs_path', () => {
    const yamlContent = `
es_snapshot_metadata:
  data:
    description: No path here
`;
    const filePath = Path.join(tmpDir, 'no-path.yaml');
    Fs.writeFileSync(filePath, yamlContent);

    expect(() => readAspectData(filePath)).toThrow('Missing data.gcs_path');
  });

  it('throws for empty YAML', () => {
    const filePath = Path.join(tmpDir, 'empty.yaml');
    Fs.writeFileSync(filePath, '');

    expect(() => readAspectData(filePath)).toThrow('Invalid YAML');
  });

  it('throws for YAML without aspect data', () => {
    const yamlContent = `
es_snapshot_metadata:
  notData: true
`;
    const filePath = Path.join(tmpDir, 'no-data.yaml');
    Fs.writeFileSync(filePath, yamlContent);

    expect(() => readAspectData(filePath)).toThrow('Missing aspect data');
  });
});

describe('listYamlFilesRecursively', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'dataplex-list-'));
  });

  afterEach(() => {
    Fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('finds YAML files in nested directories', () => {
    const subDir = Path.join(tmpDir, 'sub');
    Fs.mkdirSync(subDir);
    Fs.writeFileSync(Path.join(tmpDir, 'a.yaml'), '');
    Fs.writeFileSync(Path.join(subDir, 'b.yml'), '');
    Fs.writeFileSync(Path.join(tmpDir, 'c.txt'), '');

    const files = listYamlFilesRecursively(tmpDir);
    expect(files).toHaveLength(2);
    expect(files.map((f) => Path.basename(f)).sort()).toEqual(['a.yaml', 'b.yml']);
  });

  it('returns empty array for empty directory', () => {
    expect(listYamlFilesRecursively(tmpDir)).toEqual([]);
  });
});
