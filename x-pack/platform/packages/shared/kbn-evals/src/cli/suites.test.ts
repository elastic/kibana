/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';

import { resolveEvalSuites, readSuiteMetadata, type EvalSuiteMetadata } from './suites';

const writeMetadataFile = (root: string, suites: EvalSuiteMetadata[]) => {
  const dir = Path.join(root, '.buildkite', 'pipelines', 'evals');
  Fs.mkdirSync(dir, { recursive: true });
  Fs.writeFileSync(Path.join(dir, 'evals.suites.json'), JSON.stringify({ suites }, null, 2));
};

describe('readSuiteMetadata', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-evals-suites-'));
  });

  afterEach(() => {
    Fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('returns an empty array when metadata file is missing', () => {
    expect(readSuiteMetadata(tmpRoot)).toEqual([]);
  });

  it('preserves the optional shards field as written', () => {
    writeMetadataFile(tmpRoot, [
      {
        id: 'sharded',
        configPath: 'pkg/playwright.config.ts',
        shards: 4,
      },
      {
        id: 'unsharded',
        configPath: 'pkg/other.playwright.config.ts',
      },
    ]);

    const metadata = readSuiteMetadata(tmpRoot);
    expect(metadata).toHaveLength(2);
    expect(metadata[0].shards).toBe(4);
    expect(metadata[1].shards).toBeUndefined();
  });
});

describe('resolveEvalSuites — shards', () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-evals-suites-'));
  });

  afterEach(() => {
    Fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('surfaces a positive integer shards value through the definition', () => {
    writeMetadataFile(tmpRoot, [
      {
        id: 'entity-analytics',
        configPath: 'fake/playwright.config.ts',
        shards: 4,
      },
    ]);

    const [suite] = resolveEvalSuites(tmpRoot);
    expect(suite.shards).toBe(4);
  });

  it('returns undefined shards when omitted', () => {
    writeMetadataFile(tmpRoot, [
      {
        id: 'streams',
        configPath: 'fake/playwright.config.ts',
      },
    ]);

    const [suite] = resolveEvalSuites(tmpRoot);
    expect(suite.shards).toBeUndefined();
  });

  it.each([
    ['zero', 0],
    ['negative', -2],
    ['fractional', 1.5],
    ['string', '4' as unknown as number],
  ])('coerces invalid shards (%s) to undefined', (_, value) => {
    writeMetadataFile(tmpRoot, [
      {
        id: 'workflows',
        configPath: 'fake/playwright.config.ts',
        shards: value as number,
      },
    ]);

    const [suite] = resolveEvalSuites(tmpRoot);
    expect(suite.shards).toBeUndefined();
  });
});
