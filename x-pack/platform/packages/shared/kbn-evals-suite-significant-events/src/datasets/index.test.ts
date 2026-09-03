/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
// Imported before any env var is set: the registry must not read anything at import time.
import { getActiveDatasets, getAllDatasetIds, getDatasetById } from '.';

const write = (root: string, relativePath: string, value: unknown) => {
  const target = Path.join(root, ...relativePath.split('/'));
  Fs.mkdirSync(Path.dirname(target), { recursive: true });
  Fs.writeFileSync(target, JSON.stringify(value));
};

// The module is imported once (re-importing `@kbn/evals` would load `@playwright/test` twice, which
// Playwright rejects), so the tests below run in order against one registry instance and rely on
// the registry only caching after a successful read.
describe('datasets registry (GCS-backed)', () => {
  const ORIGINAL_DIR = process.env.KBN_EVALS_GROUND_TRUTH_DIR;
  const ORIGINAL_SELECTION = process.env.SIGEVENTS_DATASET;
  let dir: string;

  beforeAll(() => {
    dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'sigevents-registry-'));
    write(dir, 'otel-demo/dataset.json', {
      schema_version: 1,
      id: 'otel-demo',
      description: 'otel',
    });
    write(dir, 'otel-demo/healthy-baseline/ground-truth.json', {
      schema_version: 1,
      dataset: 'otel-demo',
      snapshot: 'healthy-baseline',
      kiFeatureDeduplication: [{ input: { scenario_id: 'healthy-baseline', iterations: 2 } }],
    });
    write(dir, 'bank-of-anthos/dataset.json', {
      schema_version: 1,
      id: 'bank-of-anthos',
      description: 'boa',
    });
  });

  afterAll(() => {
    Fs.rmSync(dir, { recursive: true, force: true });
    if (ORIGINAL_DIR === undefined) delete process.env.KBN_EVALS_GROUND_TRUTH_DIR;
    else process.env.KBN_EVALS_GROUND_TRUTH_DIR = ORIGINAL_DIR;
    if (ORIGINAL_SELECTION === undefined) delete process.env.SIGEVENTS_DATASET;
    else process.env.SIGEVENTS_DATASET = ORIGINAL_SELECTION;
  });

  it('reads the tree lazily on first access and stamps snapshot_source', () => {
    process.env.KBN_EVALS_GROUND_TRUTH_DIR = Path.join(dir, 'does-not-exist');
    expect(() => getAllDatasetIds()).toThrow(/is not a directory/);

    process.env.KBN_EVALS_GROUND_TRUTH_DIR = dir;
    expect(getAllDatasetIds().sort()).toEqual(['bank-of-anthos', 'otel-demo']);
    expect(getDatasetById('otel-demo')?.kiFeatureDeduplication[0].snapshot_source).toEqual({
      snapshot_name: 'healthy-baseline',
    });
    expect(getDatasetById('nope')).toBeUndefined();
  });

  it('getActiveDatasets lists available ids on an unknown selection, then honours a valid one', () => {
    process.env.KBN_EVALS_GROUND_TRUTH_DIR = dir;

    process.env.SIGEVENTS_DATASET = 'missing-one';
    expect(() => getActiveDatasets()).toThrow(
      /Unknown dataset\(s\): missing-one\. Available: bank-of-anthos, otel-demo/
    );

    process.env.SIGEVENTS_DATASET = 'otel-demo';
    expect(getActiveDatasets().map((d) => d.id)).toEqual(['otel-demo']);
  });
});
