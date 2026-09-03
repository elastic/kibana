/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readGroundTruthTreeSync } from '@kbn/evals';
import { assembleDatasets } from './assemble_datasets';
import { TYPESCRIPT_DATASETS } from '.';
import { normalizeForParity } from './parity';
import type { DatasetConfig } from './types';

const jsonClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe('normalizeForParity', () => {
  it('stamps snapshot_source and orders scenarios by snapshot name, keeping order within a snapshot', () => {
    const dataset: DatasetConfig = {
      id: 'd',
      description: 'd',
      gcs: { bucket: 'b', basePathPrefix: 'd' },
      kiQueryGeneration: [],
      kiFeatureExtraction: [],
      kiFeatureExclusion: [],
      kiFeatureDeduplication: [
        { input: { scenario_id: 'zeta', iterations: 1 } },
        {
          input: { scenario_id: 'alpha-2', iterations: 1 },
          snapshot_source: { snapshot_name: 'alpha' },
        },
        { input: { scenario_id: 'alpha', iterations: 1 } },
      ],
      discovery: [],
    };

    expect(
      normalizeForParity(dataset).kiFeatureDeduplication.map((s) => [
        s.input.scenario_id,
        s.snapshot_source?.snapshot_name,
      ])
    ).toEqual([
      ['alpha-2', 'alpha'],
      ['alpha', 'alpha'],
      ['zeta', 'zeta'],
    ]);
  });
});

// Compares the transitional TypeScript copy with a downloaded GCS tree. Skipped unless
// KBN_EVALS_GROUND_TRUTH_DIR points at one (any `evals run` populates
// target/evals/ground-truth/significant-events-datasets/<run-id>).
const groundTruthDir = process.env.KBN_EVALS_GROUND_TRUTH_DIR;
const describeWithTree = groundTruthDir ? describe : describe.skip;

describeWithTree('ground truth parity: TypeScript fallback vs GCS tree', () => {
  const assembled = groundTruthDir ? assembleDatasets(readGroundTruthTreeSync()) : {};

  it.each(Object.keys(TYPESCRIPT_DATASETS))('%s matches the downloaded ground truth', (id) => {
    expect(jsonClone(assembled[id])).toEqual(
      jsonClone(normalizeForParity(TYPESCRIPT_DATASETS[id]))
    );
  });

  it('the tree has no datasets the TypeScript copy lacks', () => {
    expect(Object.keys(assembled).sort()).toEqual(Object.keys(TYPESCRIPT_DATASETS).sort());
  });
});
