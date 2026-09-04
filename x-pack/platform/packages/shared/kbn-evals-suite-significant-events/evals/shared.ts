/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { GcsConfig } from '../src/data_generators/replay';
import { listAvailableSnapshots } from '../src/data_generators/replay';
import type { DatasetConfig, SnapshotSourceOverride } from '../src/datasets';
import { resolveScenarioSnapshotSource, snapshotCatalogKey } from '../src/datasets';

/**
 * For each dataset, resolves the GCS snapshot source for every scenario
 * (via `getScenarios`) and returns a map from catalog key → available snapshot names.
 * Collapses duplicate GCS sources so each bucket+prefix is listed only once.
 */
export async function buildAvailableSnapshotsBySource(
  datasets: DatasetConfig[],
  getScenarios: (
    dataset: DatasetConfig
  ) => Array<{ input: { scenario_id: string }; snapshot_source?: SnapshotSourceOverride }>,
  esClient: Client,
  log: ToolingLog
): Promise<Map<string, Set<string>>> {
  const uniqueCatalogSources = new Map<string, GcsConfig>();
  for (const dataset of datasets) {
    for (const scenario of getScenarios(dataset)) {
      const source = resolveScenarioSnapshotSource({
        scenarioId: scenario.input.scenario_id,
        datasetGcs: dataset.gcs,
        snapshotSource: scenario.snapshot_source,
      });
      uniqueCatalogSources.set(snapshotCatalogKey(source.gcs), source.gcs);
    }
  }

  const availableSnapshotsBySource = new Map<string, Set<string>>();
  for (const [catalogSourceKey, gcs] of uniqueCatalogSources.entries()) {
    const availableSnapshots = await listAvailableSnapshots(esClient, log, gcs);
    availableSnapshotsBySource.set(catalogSourceKey, new Set(availableSnapshots));
  }
  return availableSnapshotsBySource;
}
