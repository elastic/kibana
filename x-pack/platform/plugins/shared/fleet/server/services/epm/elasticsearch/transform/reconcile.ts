/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import { deleteTransforms } from './remove';

// Upper bound on transforms returned per reconciliation pass. A single package
// is extremely unlikely to have anywhere near this many transforms, but we cap
// it to avoid unbounded response sizes.
const MAX_TRANSFORMS_PER_PACKAGE_RECONCILE = 1000;

/**
 * Best-effort ES-side reconciliation: finds transforms owned by `pkgName` that are
 * not in `keepIds` and deletes them without touching their destination indices.
 *
 * This catches transforms that leaked from a previous broken install (e.g. the
 * double-SO-write bug fixed in elastic/kibana#217503) and were never cleaned up
 * because no saved-object ref pointed to them. It is intentionally best-effort —
 * it never throws; failures are logged and installation continues normally.
 *
 * Must be called BEFORE the new transforms are installed so that `keepIds`
 * contains only the current expected ids.
 */
export const reconcileTransforms = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  pkgName: string,
  keepIds: string[]
): Promise<void> => {
  try {
    // Query both the legacy naming pattern (<pkgName>.*) and the YAML naming pattern
    // (logs-<pkgName>.*) in a single request. allow_no_match avoids a 404 when the
    // package has never installed any transforms.
    const response = await esClient.transform.getTransform({
      transform_id: `${pkgName}.*,logs-${pkgName}.*`,
      allow_no_match: true,
      size: MAX_TRANSFORMS_PER_PACKAGE_RECONCILE,
    });

    const keepSet = new Set(keepIds);
    const orphanIds: string[] = [];

    for (const transform of response.transforms ?? []) {
      const id: string = transform.id;
      const metaPkgName: string | undefined = (
        transform as { _meta?: { package?: { name?: string } } }
      )._meta?.package?.name;

      // Only touch transforms that Fleet stamped with this package's name to
      // avoid interfering with transforms from other packages or manual installs.
      if (metaPkgName !== pkgName) continue;
      if (keepSet.has(id)) continue;

      orphanIds.push(id);
    }

    if (orphanIds.length === 0) return;

    logger.info(
      `[Fleet] Reconciling ${
        orphanIds.length
      } orphaned transform(s) for package ${pkgName}: ${orphanIds.join(', ')}`
    );

    // Delete orphans one at a time so a failure on one does not block the rest.
    // Never delete destination indices for ES-discovered orphans — a destination
    // index may be shared with, or still referenced by, external tooling.
    for (const orphanId of orphanIds) {
      try {
        await deleteTransforms(esClient, [orphanId], false);
      } catch (delErr) {
        logger.warn(
          `[Fleet] Failed to delete orphaned transform ${orphanId} for package ${pkgName} (non-fatal): ${
            delErr?.message ?? delErr
          }`
        );
      }
    }
  } catch (err) {
    logger.warn(
      `[Fleet] Transform reconciliation for package ${pkgName} failed (non-fatal): ${
        err?.message ?? err
      }`
    );
  }
};
