/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GroundTruthSource } from '@kbn/evals';
import { GCS_BUCKET } from '../constants';

export interface GcsConfig {
  bucket: string;
  basePathPrefix: string;
}

/**
 * Identifies which snapshot run to replay. Each run is stored at the top
 * level of the bucket: `<run-id>/<dataset>/`.
 *
 * Override at runtime with:
 *   SIGEVENTS_SNAPSHOT_RUN=2026-02-23 node scripts/scout ...
 */
export const SIGEVENTS_SNAPSHOT_RUN = process.env.SIGEVENTS_SNAPSHOT_RUN || '2026-03-27';

export const resolveBasePath = (gcs: GcsConfig) =>
  `${SIGEVENTS_SNAPSHOT_RUN}/${gcs.basePathPrefix}`;

/**
 * Where this suite's ground truth lives: the same `<run-id>/` folder as the snapshots it describes.
 * Layout: `<run-id>/<dataset-id>/dataset.json` and `<run-id>/<dataset-id>/<snapshot>/ground-truth.json`.
 */
export const SIGEVENTS_GROUND_TRUTH_SOURCE: GroundTruthSource = {
  bucket: GCS_BUCKET,
  prefix: `${SIGEVENTS_SNAPSHOT_RUN}/`,
};

export type SigEventsGroundTruthMode = 'gcs' | 'ts';

/**
 * Where the registry reads ground truth from. `gcs` (default) downloads the JSON files from the
 * bucket; `ts` uses the TypeScript datasets kept in `src/datasets/` as a transitional fallback
 * until they are removed. The bucket is the source of record in both modes.
 */
export const resolveGroundTruthMode = (
  env: NodeJS.ProcessEnv = process.env
): SigEventsGroundTruthMode => {
  const raw = (env.SIGEVENTS_GROUND_TRUTH_MODE ?? 'gcs').trim();
  if (raw === 'gcs' || raw === 'ts') {
    return raw;
  }
  throw new Error(`SIGEVENTS_GROUND_TRUTH_MODE must be "gcs" or "ts", got "${raw}".`);
};
