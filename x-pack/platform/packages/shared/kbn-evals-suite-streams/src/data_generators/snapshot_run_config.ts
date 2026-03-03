/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GcsConfig {
  bucket: string;
  basePathPrefix: string;
}

/**
 * Identifies which snapshot run to replay. Each run is stored in its own
 * GCS subfolder: `<basePathPrefix>/<run-id>/`.
 *
 * Override at runtime with:
 *   SIGEVENTS_SNAPSHOT_RUN=2026-02-25 node scripts/scout ...
 */
export const SIGEVENTS_SNAPSHOT_RUN = process.env.SIGEVENTS_SNAPSHOT_RUN || '2026-02-25';

export const resolveBasePath = (gcs: GcsConfig) =>
  `${gcs.basePathPrefix}/${SIGEVENTS_SNAPSHOT_RUN}`;
