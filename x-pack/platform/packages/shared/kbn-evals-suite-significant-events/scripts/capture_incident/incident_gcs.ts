/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import execa from 'execa';
import type { Client } from '@elastic/elasticsearch';
import type { Metadata } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
import { createGcsRepository } from '@kbn/es-snapshot-loader';
import { NIGHTSHIFT_INCIDENT_BUCKET } from './constants';

// The ES snapshot repository is just a local handle over the GCS bucket, so it
// reuses the bucket name rather than a separate identifier.
const INCIDENT_REPO_NAME = NIGHTSHIFT_INCIDENT_BUCKET;

// A `wait_for_completion` snapshot of a large multi-dataset slice can run well
// past the client's default 30s request timeout, so allow up to 30 minutes.
const SNAPSHOT_CREATE_REQUEST_TIMEOUT_MS = 30 * 60 * 1000;

export function generateIncidentSnapshotName(incidentId: string): string {
  return `incident-${incidentId}`;
}

/**
 * Registers the persistent nightshift incident GCS repository pointed at the
 * incident's base path. Reuses the package's GCS repository strategy so the
 * settings/verification behavior stays consistent with create/restore/replay.
 */
export async function registerIncidentGcsRepository({
  esClient,
  log,
  basePath,
  verify = true,
}: {
  esClient: Client;
  log: ToolingLog;
  basePath: string;
  verify?: boolean;
}): Promise<void> {
  log.info(
    `Registering GCS snapshot repository "${INCIDENT_REPO_NAME}" → ${NIGHTSHIFT_INCIDENT_BUCKET}/${basePath}`
  );

  const repository = createGcsRepository({ bucket: NIGHTSHIFT_INCIDENT_BUCKET, basePath });
  repository.validate();
  await repository.register({ esClient, log, repoName: INCIDENT_REPO_NAME, verify });

  log.info('GCS repository registered');
}

export async function createIncidentSnapshot({
  esClient,
  log,
  snapshotName,
  indices,
  metadata,
}: {
  esClient: Client;
  log: ToolingLog;
  snapshotName: string;
  indices: string;
  metadata: Metadata;
}): Promise<{ indices: string[]; successfulShards?: number; totalShards?: number }> {
  // Snapshot metadata is immutable once created — refuse to silently no-op on an
  // existing snapshot so the caller knows to delete/rename before recreating.
  try {
    await esClient.snapshot.get({ repository: INCIDENT_REPO_NAME, snapshot: snapshotName });
    throw new Error(
      `Snapshot "${INCIDENT_REPO_NAME}/${snapshotName}" already exists. ` +
        `Snapshot metadata is immutable — delete it first to recreate:\n` +
        `  DELETE _snapshot/${INCIDENT_REPO_NAME}/${snapshotName}`
    );
  } catch (err) {
    const statusCode = (err as { meta?: { statusCode?: number } })?.meta?.statusCode;
    if (statusCode !== 404) {
      throw err;
    }
  }

  log.info(`Creating snapshot "${INCIDENT_REPO_NAME}/${snapshotName}" (indices: ${indices})`);

  const result = await esClient.snapshot.create(
    {
      repository: INCIDENT_REPO_NAME,
      snapshot: snapshotName,
      wait_for_completion: true,
      indices,
      include_global_state: false,
      metadata,
    },
    { requestTimeout: SNAPSHOT_CREATE_REQUEST_TIMEOUT_MS }
  );

  const shards = result.snapshot?.shards;
  log.info(
    `Snapshot "${snapshotName}" created — ${shards?.successful ?? '?'}/${
      shards?.total ?? '?'
    } shards, state: ${result.snapshot?.state ?? 'UNKNOWN'}`
  );

  return {
    indices: result.snapshot?.indices ?? [],
    successfulShards: shards?.successful,
    totalShards: shards?.total,
  };
}

/**
 * Writes a bucket-local `manifest.json` next to the snapshot so the incident is
 * identifiable by browsing the GCS console alone, without hitting the ES API.
 * Uses the `gcloud`/`gsutil` CLI (same approach as other GCS tooling in the repo)
 * rather than adding a Node GCS client dependency.
 */
export async function uploadManifest({
  log,
  basePath,
  manifest,
}: {
  log: ToolingLog;
  basePath: string;
  manifest: Record<string, unknown>;
}): Promise<void> {
  const destination = `gs://${NIGHTSHIFT_INCIDENT_BUCKET}/${basePath}/manifest.json`;
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'incident-manifest-'));
  const tempFilePath = path.join(tempDir, 'manifest.json');

  try {
    await fs.promises.writeFile(tempFilePath, JSON.stringify(manifest, null, 2), 'utf8');

    const commands: Array<[cmd: string, args: string[]]> = [
      ['gcloud', ['storage', 'cp', tempFilePath, destination]],
      ['gsutil', ['cp', tempFilePath, destination]],
    ];

    let lastError: unknown;
    for (const [cmd, args] of commands) {
      try {
        await execa(cmd, args, { stdout: 'inherit', stderr: 'inherit' });
        log.info(`Uploaded manifest → ${destination}`);
        return;
      } catch (err) {
        lastError = err;
      }
    }

    log.warning(
      `Could not upload manifest.json to ${destination} (gcloud/gsutil unavailable or failed). ` +
        `The snapshot still carries the same info in its native metadata. ` +
        `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`
    );
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}
