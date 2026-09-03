/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroundTruthEntry } from '@kbn/evals';
import { GCS_BUCKET } from '../constants';
import { assembleDatasets } from './assemble_datasets';

const manifest = (id: string): GroundTruthEntry => ({
  relativePath: `${id}/dataset.json`,
  json: { schema_version: 1, id, description: `${id} description` },
});

const dedup = (scenarioId: string) => ({ input: { scenario_id: scenarioId, iterations: 3 } });

/** A slice entry with a correct envelope; pass envelope overrides to test mismatches. */
const slice = (
  datasetId: string,
  snapshot: string,
  families: Record<string, unknown>,
  envelope: Record<string, unknown> = {}
): GroundTruthEntry => ({
  relativePath: `${datasetId}/${snapshot}/ground-truth.json`,
  json: { schema_version: 1, dataset: datasetId, snapshot, ...families, ...envelope },
});

describe('assembleDatasets', () => {
  it('builds one DatasetConfig per dataset directory and derives gcs from the id', () => {
    const datasets = assembleDatasets([manifest('otel-demo'), manifest('bank-of-anthos')]);

    expect(Object.keys(datasets).sort()).toEqual(['bank-of-anthos', 'otel-demo']);
    expect(datasets['otel-demo']).toEqual({
      id: 'otel-demo',
      description: 'otel-demo description',
      gcs: { bucket: GCS_BUCKET, basePathPrefix: 'otel-demo' },
      kiQueryGeneration: [],
      kiFeatureExtraction: [],
      kiFeatureExclusion: [],
      kiFeatureDeduplication: [],
      discovery: [],
    });
  });

  it('concatenates slices in snapshot-name order and stamps snapshot_source from the directory', () => {
    const datasets = assembleDatasets([
      manifest('otel-demo'),
      slice('otel-demo', 'payment-unreachable', {
        kiFeatureDeduplication: [dedup('payment-unreachable')],
      }),
      slice('otel-demo', 'healthy-baseline', {
        kiFeatureDeduplication: [dedup('healthy-baseline')],
        kiFeatureExclusion: [
          {
            input: {
              scenario_id: 'healthy-baseline',
              sample_document_count: 20,
              exclude_count: 4,
              follow_up_runs: 3,
            },
          },
        ],
      }),
    ]);

    expect(datasets['otel-demo'].kiFeatureDeduplication).toEqual([
      { ...dedup('healthy-baseline'), snapshot_source: { snapshot_name: 'healthy-baseline' } },
      {
        ...dedup('payment-unreachable'),
        snapshot_source: { snapshot_name: 'payment-unreachable' },
      },
    ]);
    expect(datasets['otel-demo'].kiFeatureExclusion[0].snapshot_source).toEqual({
      snapshot_name: 'healthy-baseline',
    });
    expect(datasets['otel-demo'].discovery).toEqual([]);
  });

  it('lets scenarios with different ids share one snapshot directory', () => {
    const datasets = assembleDatasets([
      manifest('bank-of-anthos'),
      slice('bank-of-anthos', 'ledger-db-disconnect', {
        kiFeatureDeduplication: [
          dedup('ledger-db-disconnect'),
          dedup('ledger-balancereader-weak-detection'),
        ],
      }),
    ]);

    expect(
      datasets['bank-of-anthos'].kiFeatureDeduplication.map((s) => [
        s.input.scenario_id,
        s.snapshot_source?.snapshot_name,
      ])
    ).toEqual([
      ['ledger-db-disconnect', 'ledger-db-disconnect'],
      ['ledger-balancereader-weak-detection', 'ledger-db-disconnect'],
    ]);
  });

  it('throws when a dataset directory has no manifest or the manifest id does not match', () => {
    expect(() => assembleDatasets([slice('otel-demo', 'healthy-baseline', {})])).toThrow(
      /Dataset directory "otel-demo" has no dataset\.json/
    );
    expect(() =>
      assembleDatasets([
        {
          relativePath: 'otel-demo/dataset.json',
          json: { schema_version: 1, id: 'other', description: 'd' },
        },
      ])
    ).toThrow(/id "other" does not match directory "otel-demo"/);
  });

  it('rejects a slice envelope that disagrees with its directory or has an unknown schema_version', () => {
    expect(() =>
      assembleDatasets([
        manifest('otel-demo'),
        slice('otel-demo', 'healthy-baseline', {}, { dataset: 'other' }),
      ])
    ).toThrow(/dataset "other" does not match directory "otel-demo"/);
    expect(() =>
      assembleDatasets([
        manifest('otel-demo'),
        slice('otel-demo', 'healthy-baseline', {}, { snapshot: 'x' }),
      ])
    ).toThrow(/snapshot "x" does not match directory "healthy-baseline"/);
    expect(() =>
      assembleDatasets([
        manifest('otel-demo'),
        slice('otel-demo', 'healthy-baseline', {}, { schema_version: 2 }),
      ])
    ).toThrow(/schema_version/);
  });

  it('names the file and the field on a schema violation', () => {
    expect(() =>
      assembleDatasets([
        manifest('otel-demo'),
        slice('otel-demo', 'healthy-baseline', {
          kiFeatureDeduplication: [{ input: { scenario_id: 'x' } }],
        }),
      ])
    ).toThrow(/otel-demo\/healthy-baseline\/ground-truth\.json[\s\S]*iterations/);
  });

  it('rejects snapshot_source inside a scenario and unknown families', () => {
    expect(() =>
      assembleDatasets([
        manifest('otel-demo'),
        slice('otel-demo', 'healthy-baseline', {
          kiFeatureDeduplication: [{ ...dedup('x'), snapshot_source: { snapshot_name: 'other' } }],
        }),
      ])
    ).toThrow(/snapshot_source/);
    expect(() =>
      assembleDatasets([
        manifest('otel-demo'),
        slice('otel-demo', 'healthy-baseline', { kiSomethingElse: [] }),
      ])
    ).toThrow(/kiSomethingElse/);
  });
});
