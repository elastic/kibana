/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { expect } from '@kbn/scout/api';
import type { EsClient } from '@kbn/scout';

// A snapshot that hasn't been registered yet surfaces as `snapshot_missing_exception`; every other
// error (auth, wrong repository name, etc.) is a real failure and must be surfaced, not polled on.
const isSnapshotMissingError = (error: unknown): boolean =>
  error instanceof errors.ResponseError && error.body?.error?.type === 'snapshot_missing_exception';

/**
 * Waits for a snapshot (exact name or wildcard pattern) to reach a terminal state. SLM runs are
 * asynchronous, so this polls the cluster instead of sleeping before assertions.
 */
export const waitForSnapshotToFinish = async (
  esClient: EsClient,
  repository: string,
  snapshot: string
): Promise<void> => {
  const readState = async () => {
    const snapshots = await esClient.snapshot
      .get({ repository, snapshot, ignore_unavailable: true })
      .then((response) => response.snapshots)
      .catch((error) => {
        if (isSnapshotMissingError(error)) {
          return undefined;
        }
        throw error;
      });
    return snapshots?.[0]?.state;
  };

  // Includes `FAILED`: polling only for success states would spend the whole budget on an
  // already-failed snapshot and report a timeout instead of the real cause.
  await expect
    .poll(readState, { timeout: 30_000, intervals: [500, 1_000, 2_000] })
    .toMatch(/SUCCESS|PARTIAL|FAILED/);

  expect(
    await readState(),
    `snapshot "${snapshot}" in repository "${repository}" did not complete successfully`
  ).toMatch(/SUCCESS|PARTIAL/);
};
