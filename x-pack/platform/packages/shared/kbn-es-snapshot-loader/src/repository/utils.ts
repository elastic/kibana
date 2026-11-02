/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { SnapshotInfo } from '../types';

export function generateRepoName(): string {
  return `snapshot-loader-repo-${Date.now()}`;
}

export async function getSnapshotMetadata({
  esClient,
  log,
  repoName,
  snapshotName,
}: {
  esClient: Client;
  log: ToolingLog;
  repoName: string;
  snapshotName?: string;
}): Promise<SnapshotInfo> {
  log.debug('Reading snapshot metadata...');

  const response = await esClient.snapshot.get({
    repository: repoName,
    snapshot: snapshotName || '*',
  });
  const snapshots = response.snapshots ?? [];

  if (snapshots.length === 0) {
    if (snapshotName) {
      throw new Error(`Snapshot "${snapshotName}" was not found in repository ${repoName}`);
    }
    throw new Error(`No snapshots found in repository ${repoName}`);
  }

  const successfulSnapshots = snapshots.filter((s) => {
    return s.state === 'SUCCESS' && s.end_time != null;
  });

  if (successfulSnapshots.length === 0) {
    if (snapshotName) {
      throw new Error(
        `No restorable snapshots found for snapshot "${snapshotName}" in repository ${repoName}`
      );
    }
    throw new Error(`No restorable snapshots found in repository ${repoName}`);
  }

  const selected = [...successfulSnapshots].sort((a, b) => {
    const aTime = a.end_time_in_millis ?? 0;
    const bTime = b.end_time_in_millis ?? 0;
    return bTime - aTime;
  })[0];

  if (!selected.snapshot) {
    throw new Error(`Snapshot has no name in repository ${repoName}`);
  }

  const info: SnapshotInfo = {
    snapshot: selected.snapshot,
    indices: selected.indices ?? [],
    startTime: String(selected.start_time ?? ''),
    endTime: String(selected.end_time!),
    state: selected.state ?? 'unknown',
  };

  log.info(`Found snapshot: ${info.snapshot} with ${info.indices.length} indices`);
  return info;
}

export async function deleteRepository({
  esClient,
  log,
  repoName,
}: {
  esClient: Client;
  log: ToolingLog;
  repoName: string;
}): Promise<void> {
  try {
    await esClient.snapshot.deleteRepository({ name: repoName });
  } catch (error) {
    log.debug(`Failed to delete repository: ${error}`);
  }
}
