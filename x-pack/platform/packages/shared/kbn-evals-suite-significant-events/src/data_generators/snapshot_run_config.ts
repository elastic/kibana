/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GcsConfig {
  bucket: string;
  basePathPrefix: string;
  /**
   * When `false`, `basePathPrefix` is used as the full GCS base path without the
   * {@link SIGEVENTS_SNAPSHOT_RUN} prefix. Incident snapshots are captured once per
   * incident (not per run), so they live at a run-independent path such as
   * `customer0-incidents/incident-3048`. Defaults to `true` (run-scoped).
   */
  runScoped?: boolean;
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
  gcs.runScoped === false ? gcs.basePathPrefix : `${SIGEVENTS_SNAPSHOT_RUN}/${gcs.basePathPrefix}`;
