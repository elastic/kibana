/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetConfig, KIQueryGenerationScenario } from '../../src/datasets';
import { resolveQueryGenerationDatasets } from './resolve_scenarios';

const scenario = (id: string): KIQueryGenerationScenario => ({
  input: {
    scenario_id: id,
    stream_name: 'logs',
    stream_description: id,
  },
  output: {
    criteria: [],
    expected_categories: [],
    expected_ground_truth: 'ground-truth',
  },
  metadata: {
    difficulty: 'medium',
    failure_domain: 'test-domain',
  },
});

const dataset = (id: string, scenarioIds: string[]): DatasetConfig => ({
  id,
  description: id,
  gcs: { bucket: 'bucket', basePathPrefix: 'prefix' },
  kiQueryGeneration: scenarioIds.map(scenario),
  kiFeatureExtraction: [],
  kiFeatureExclusion: [],
  kiFeatureDeduplication: [],
  discovery: [],
});

const DATASETS = [
  dataset('otel-demo', ['healthy-baseline', 'payment-unreachable']),
  dataset('bank-of-anthos', ['healthy-baseline', 'ledger-db-disconnect']),
];

describe('resolveQueryGenerationDatasets', () => {
  it('returns every scenario when the selection is unset', () => {
    expect(resolveQueryGenerationDatasets(DATASETS, undefined)).toEqual(DATASETS);
  });

  it('returns every scenario for an empty selection', () => {
    expect(resolveQueryGenerationDatasets(DATASETS, '')).toEqual(DATASETS);
  });

  it('returns a single valid ID once', () => {
    expect(resolveQueryGenerationDatasets(DATASETS, 'payment-unreachable')).toEqual([
      {
        ...DATASETS[0],
        kiQueryGeneration: [DATASETS[0].kiQueryGeneration[1]],
      },
    ]);
  });

  it('deduplicates duplicate IDs', () => {
    expect(resolveQueryGenerationDatasets(DATASETS, 'healthy-baseline,healthy-baseline')).toEqual([
      { ...DATASETS[0], kiQueryGeneration: [DATASETS[0].kiQueryGeneration[0]] },
      { ...DATASETS[1], kiQueryGeneration: [DATASETS[1].kiQueryGeneration[0]] },
    ]);
  });

  it('preserves source order across multiple IDs', () => {
    expect(
      resolveQueryGenerationDatasets(DATASETS, 'ledger-db-disconnect,payment-unreachable')
    ).toEqual([
      { ...DATASETS[0], kiQueryGeneration: [DATASETS[0].kiQueryGeneration[1]] },
      { ...DATASETS[1], kiQueryGeneration: [DATASETS[1].kiQueryGeneration[1]] },
    ]);
  });

  it('skips other datasets when an ID is present in only one dataset', () => {
    expect(resolveQueryGenerationDatasets(DATASETS, 'ledger-db-disconnect')).toEqual([
      { ...DATASETS[1], kiQueryGeneration: [DATASETS[1].kiQueryGeneration[1]] },
    ]);
  });

  it('throws and lists available IDs for an unknown ID', () => {
    expect(() => resolveQueryGenerationDatasets(DATASETS, 'nope')).toThrow(
      /nope.*Available: healthy-baseline, payment-unreachable, ledger-db-disconnect/
    );
  });

  it('throws on empty comma items', () => {
    expect(() => resolveQueryGenerationDatasets(DATASETS, 'ledger-db-disconnect,')).toThrow(
      /empty item/
    );
    expect(() => resolveQueryGenerationDatasets(DATASETS, ',ledger-db-disconnect')).toThrow(
      /empty item/
    );
  });

  it('does not mutate the source dataset objects', () => {
    const before = JSON.stringify(DATASETS);
    resolveQueryGenerationDatasets(DATASETS, 'healthy-baseline');
    expect(JSON.stringify(DATASETS)).toBe(before);
  });
});
