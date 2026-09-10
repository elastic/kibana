/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GcsConfig } from '../data_generators/replay';
import { bankOfAnthosDataset } from './bank_of_anthos';
import { incidentsDataset } from './incidents';
import { otelDemoDataset } from './otel_demo';
import { quarkusSuperHeroesDataset } from './quarkus_super_heroes';
import type { DatasetConfig, SnapshotSourceOverride } from './types';

export const MANAGED_STREAM_NAME = 'logs';
export const MANAGED_STREAM_SEARCH_PATTERN = `${MANAGED_STREAM_NAME}*`;

const DATASETS: readonly DatasetConfig[] = [
  otelDemoDataset,
  bankOfAnthosDataset,
  quarkusSuperHeroesDataset,
  incidentsDataset,
];

const ALL_DATASETS_SELECTOR = 'all';

const getDefaultDatasets = (): DatasetConfig[] => DATASETS.filter(({ optIn }) => optIn !== true);

export const getDatasetById = (id: string): DatasetConfig | undefined =>
  DATASETS.find((dataset) => dataset.id === id);

export const getAllDatasetIds = (): string[] => DATASETS.map(({ id }) => id);

export const getDefaultDatasetIds = (): string[] => getDefaultDatasets().map(({ id }) => id);

export const hasExplicitDatasetSelection = (selectedDatasetIds: string | undefined): boolean =>
  Boolean(selectedDatasetIds?.trim());

export const resolveRequestedDatasetIds = (selectedDatasetIds: string | undefined): string[] => {
  const normalizedSelectedDatasetIds = selectedDatasetIds?.trim();

  if (!normalizedSelectedDatasetIds) {
    return getDefaultDatasetIds();
  }

  const requestedDatasets = [
    ...new Set(normalizedSelectedDatasetIds.split(',').map((id) => id.trim())),
  ].filter(Boolean);

  if (requestedDatasets.includes(ALL_DATASETS_SELECTOR)) {
    return getAllDatasetIds();
  }

  const unknownDatasetIds = requestedDatasets.filter((id) => getDatasetById(id) == null);
  if (unknownDatasetIds.length > 0) {
    const available = getAllDatasetIds().join(', ');
    throw new Error(
      `Unknown dataset(s): ${unknownDatasetIds.join(', ')}. Available: ${available}. ` +
        `Set SIGEVENTS_DATASET to a dataset id, a comma-separated list, or "${ALL_DATASETS_SELECTOR}".`
    );
  }

  return requestedDatasets;
};

export const getActiveDatasets = (): DatasetConfig[] =>
  resolveRequestedDatasetIds(process.env.SIGEVENTS_DATASET).flatMap(
    (id) => getDatasetById(id) ?? []
  );

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
      runScoped: datasetGcs.runScoped,
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
