/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetConfig, SnapshotSourceOverride } from './types';
import { resolveScenarioSnapshotSource } from '.';

interface ScenarioLike {
  input: { scenario_id: string };
  snapshot_source?: SnapshotSourceOverride;
}

const normalizeFamily = <T extends ScenarioLike>(dataset: DatasetConfig, scenarios: T[]): T[] =>
  scenarios
    .map((scenario, index) => {
      const { snapshotName } = resolveScenarioSnapshotSource({
        scenarioId: scenario.input.scenario_id,
        datasetGcs: dataset.gcs,
        snapshotSource: scenario.snapshot_source,
      });
      return {
        index,
        snapshotName,
        scenario: { ...scenario, snapshot_source: { snapshot_name: snapshotName } },
      };
    })
    .sort((a, b) => {
      if (a.snapshotName !== b.snapshotName) {
        return a.snapshotName < b.snapshotName ? -1 : 1;
      }
      return a.index - b.index;
    })
    .map(({ scenario }) => scenario);

/**
 * Rewrites a TypeScript-defined dataset into the shape `assembleDatasets` produces from the GCS
 * tree: every scenario stamped with its resolved snapshot, families ordered by snapshot name.
 * Lets the two copies be compared with a deep equality check while both exist.
 */
export const normalizeForParity = (dataset: DatasetConfig): DatasetConfig => ({
  ...dataset,
  kiQueryGeneration: normalizeFamily(dataset, dataset.kiQueryGeneration),
  kiFeatureExtraction: normalizeFamily(dataset, dataset.kiFeatureExtraction),
  kiFeatureExclusion: normalizeFamily(dataset, dataset.kiFeatureExclusion),
  kiFeatureDeduplication: normalizeFamily(dataset, dataset.kiFeatureDeduplication),
  discovery: normalizeFamily(dataset, dataset.discovery),
});
