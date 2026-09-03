/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readGroundTruthTreeSync } from '@kbn/evals';
import type { GcsConfig, SigEventsGroundTruthMode } from '../data_generators/replay';
import { resolveGroundTruthMode } from '../data_generators/snapshot_run_config';
import {
  BANK_OF_ANTHOS_NAMESPACE,
  OTEL_DEMO_NAMESPACE,
  QUARKUS_SUPER_HEROES_NAMESPACE,
} from '../constants';
import { assembleDatasets } from './assemble_datasets';
import { bankOfAnthosDataset } from './bank_of_anthos';
import { otelDemoDataset } from './otel_demo';
import { quarkusSuperHeroesDataset } from './quarkus_super_heroes';
import type { DatasetConfig, SnapshotSourceOverride } from './types';

export const MANAGED_STREAM_NAME = 'logs';
export const MANAGED_STREAM_SEARCH_PATTERN = `${MANAGED_STREAM_NAME}*`;

/**
 * Transitional fallback (`SIGEVENTS_GROUND_TRUTH_MODE=ts`). The bucket is the source of record;
 * these copies are frozen and compared against it by `parity.test.ts`. Scheduled for removal once
 * evals on main have run from GCS.
 */
export const TYPESCRIPT_DATASETS: Record<string, DatasetConfig> = {
  [OTEL_DEMO_NAMESPACE]: otelDemoDataset,
  [BANK_OF_ANTHOS_NAMESPACE]: bankOfAnthosDataset,
  [QUARKUS_SUPER_HEROES_NAMESPACE]: quarkusSuperHeroesDataset,
};

const datasetsCache: Partial<Record<SigEventsGroundTruthMode, Record<string, DatasetConfig>>> = {};

/**
 * Ground truth is read on first access, so importing this module has no side effects. In `gcs`
 * mode (default) it comes from `KBN_EVALS_GROUND_TRUTH_DIR`, populated by the @kbn/evals global
 * setup or set locally; in `ts` mode from the TypeScript fallback above.
 */
const loadDatasets = (): Record<string, DatasetConfig> => {
  const mode = resolveGroundTruthMode();
  if (!datasetsCache[mode]) {
    datasetsCache[mode] =
      mode === 'ts' ? TYPESCRIPT_DATASETS : assembleDatasets(readGroundTruthTreeSync());
  }
  return datasetsCache[mode];
};

let cachedActiveDatasets: DatasetConfig[] | undefined;

const ALL_DATASETS_SELECTOR = 'all';

const resolveRequestedDatasetIds = (selectedDatasetIds: string | undefined): string[] => {
  const allIds = Object.keys(loadDatasets());
  const normalizedSelectedDatasetIds = selectedDatasetIds?.trim();

  if (!normalizedSelectedDatasetIds || normalizedSelectedDatasetIds === ALL_DATASETS_SELECTOR) {
    return allIds;
  }

  const requestedDatasets = [
    ...new Set(normalizedSelectedDatasetIds.split(',').map((id) => id.trim())),
  ].filter(Boolean);

  if (requestedDatasets.includes(ALL_DATASETS_SELECTOR)) {
    return allIds;
  }

  return requestedDatasets;
};

export const getActiveDatasets = (): DatasetConfig[] => {
  if (cachedActiveDatasets) {
    return cachedActiveDatasets;
  }

  const datasets = loadDatasets();
  const requestedDatasetIds = resolveRequestedDatasetIds(process.env.SIGEVENTS_DATASET);

  const unknownDatasetIds = requestedDatasetIds.filter((id) => datasets[id] == null);
  if (unknownDatasetIds.length > 0) {
    const available = Object.keys(datasets).join(', ');
    throw new Error(
      `Unknown dataset(s): ${unknownDatasetIds.join(', ')}. Available: ${available}. ` +
        `Set SIGEVENTS_DATASET to a dataset id, a comma-separated list, or "${ALL_DATASETS_SELECTOR}".`
    );
  }

  cachedActiveDatasets = requestedDatasetIds.map((id) => datasets[id]);
  return cachedActiveDatasets;
};

export const resolveScenarioSnapshotSource = ({
  scenarioId,
  datasetGcs,
  snapshotSource,
}: {
  scenarioId: string;
  datasetGcs: GcsConfig;
  snapshotSource?: SnapshotSourceOverride;
}): { snapshotName: string; gcs: GcsConfig } => {
  return {
    snapshotName: snapshotSource?.snapshot_name || scenarioId,
    gcs: {
      bucket: datasetGcs.bucket,
      basePathPrefix: snapshotSource?.gcs?.basePathPrefix ?? datasetGcs.basePathPrefix,
    },
  };
};

export const snapshotCatalogKey = (gcs: GcsConfig): string => `${gcs.bucket}/${gcs.basePathPrefix}`;

export const snapshotSourceKey = ({
  gcs,
  snapshotName,
}: {
  gcs: GcsConfig;
  snapshotName: string;
}): string => {
  return `${gcs.bucket}/${gcs.basePathPrefix}::${snapshotName}`;
};

export const getAllDatasetIds = (): string[] => Object.keys(loadDatasets());

export const getDatasetById = (id: string): DatasetConfig | undefined => loadDatasets()[id];

export type {
  DatasetConfig,
  KIQueryGenerationScenario,
  KIFeatureExtractionScenario,
  KIFeatureExclusionScenario,
  KIFeatureDeduplicationScenario,
  DiscoveryScenario,
  SamplingCriterion,
  SnapshotSourceOverride,
} from './types';
