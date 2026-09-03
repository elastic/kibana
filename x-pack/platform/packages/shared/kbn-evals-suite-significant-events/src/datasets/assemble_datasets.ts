/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroundTruthEntry } from '@kbn/evals';
import { z } from '@kbn/zod';
import { GCS_BUCKET } from '../constants';
import { datasetManifestSchema, groundTruthSliceSchema } from './schema';
import type { DatasetConfig, SnapshotSourceOverride } from './types';

export const DATASET_MANIFEST_FILENAME = 'dataset.json';
export const GROUND_TRUTH_FILENAME = 'ground-truth.json';

const parseFile = <T>(schema: z.ZodType<T>, entry: GroundTruthEntry): T => {
  const result = schema.safeParse(entry.json);
  if (!result.success) {
    throw new Error(
      `Invalid ground-truth file ${entry.relativePath}:\n${z.prettifyError(result.error)}`
    );
  }
  return result.data;
};

const stamp = <T>(
  scenarios: T[] | undefined,
  snapshotName: string
): Array<T & { snapshot_source: SnapshotSourceOverride }> =>
  (scenarios ?? []).map((scenario) => ({
    ...scenario,
    snapshot_source: { snapshot_name: snapshotName },
  }));

/**
 * Rebuilds `DatasetConfig` objects from the on-disk ground-truth tree:
 * `<dataset-id>/dataset.json` plus `<dataset-id>/<scenario-snapshot>/ground-truth.json`.
 * Scenarios are concatenated per family in snapshot-name order and stamped with their snapshot.
 */
export const assembleDatasets = (entries: GroundTruthEntry[]): Record<string, DatasetConfig> => {
  const entriesByDataset = new Map<string, GroundTruthEntry[]>();
  for (const entry of entries) {
    const [datasetId] = entry.relativePath.split('/');
    if (!datasetId) {
      continue;
    }
    entriesByDataset.set(datasetId, [...(entriesByDataset.get(datasetId) ?? []), entry]);
  }

  const datasets: Record<string, DatasetConfig> = {};
  for (const [datasetId, datasetEntries] of entriesByDataset) {
    const manifestEntry = datasetEntries.find(
      (entry) => entry.relativePath === `${datasetId}/${DATASET_MANIFEST_FILENAME}`
    );
    if (!manifestEntry) {
      throw new Error(
        `Dataset directory "${datasetId}" has no ${DATASET_MANIFEST_FILENAME} manifest`
      );
    }
    const manifest = parseFile(datasetManifestSchema, manifestEntry);
    if (manifest.id !== datasetId) {
      throw new Error(
        `${DATASET_MANIFEST_FILENAME} id "${manifest.id}" does not match directory "${datasetId}"`
      );
    }

    const dataset: DatasetConfig = {
      id: manifest.id,
      description: manifest.description,
      gcs: { bucket: GCS_BUCKET, basePathPrefix: datasetId },
      kiQueryGeneration: [],
      kiFeatureExtraction: [],
      kiFeatureExclusion: [],
      kiFeatureDeduplication: [],
      discovery: [],
    };

    const sliceEntries = datasetEntries
      .filter((entry) => {
        const parts = entry.relativePath.split('/');
        return parts.length === 3 && parts[2] === GROUND_TRUTH_FILENAME;
      })
      .sort((a, b) => (a.relativePath < b.relativePath ? -1 : 1));

    for (const sliceEntry of sliceEntries) {
      const snapshotName = sliceEntry.relativePath.split('/')[1];
      const slice = parseFile(groundTruthSliceSchema, sliceEntry);
      if (slice.dataset !== datasetId) {
        throw new Error(
          `${sliceEntry.relativePath}: dataset "${slice.dataset}" does not match directory "${datasetId}"`
        );
      }
      if (slice.snapshot !== snapshotName) {
        throw new Error(
          `${sliceEntry.relativePath}: snapshot "${slice.snapshot}" does not match directory "${snapshotName}"`
        );
      }
      dataset.kiQueryGeneration.push(...stamp(slice.kiQueryGeneration, snapshotName));
      dataset.kiFeatureExtraction.push(...stamp(slice.kiFeatureExtraction, snapshotName));
      dataset.kiFeatureExclusion.push(...stamp(slice.kiFeatureExclusion, snapshotName));
      dataset.kiFeatureDeduplication.push(...stamp(slice.kiFeatureDeduplication, snapshotName));
      dataset.discovery.push(...stamp(slice.discovery, snapshotName));
    }

    datasets[datasetId] = dataset;
  }
  return datasets;
};
