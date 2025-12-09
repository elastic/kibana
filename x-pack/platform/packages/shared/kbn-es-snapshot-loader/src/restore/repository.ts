/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { SnapshotInfo } from '../types';

export function generateRepoName(): string {
  return `snapshot-loader-repo-${Date.now()}`;
}

export async function registerUrlRepository({
  esClient,
  logger,
  repoName,
  snapshotUrl,
}: {
  esClient: Client;
  logger: Logger;
  repoName: string;
  snapshotUrl: string;
}): Promise<void> {
  logger.debug(`Connecting to snapshot at ${snapshotUrl}`);

  await esClient.snapshot.createRepository({
    name: repoName,
    body: { type: 'url', settings: { url: snapshotUrl } },
  });
}

export async function getSnapshotMetadata({
  esClient,
  logger,
  repoName,
}: {
  esClient: Client;
  logger: Logger;
  repoName: string;
}): Promise<SnapshotInfo> {
  logger.debug('Reading snapshot metadata...');

  const response = await esClient.snapshot.get({ repository: repoName, snapshot: '*' });
  const snapshots = response.snapshots ?? [];

  if (snapshots.length === 0) {
    throw new Error(`No snapshots found in repository ${repoName}`);
  }

  const sortedSnapshots = [...snapshots].sort((a, b) => {
    const aTime = a.end_time ? new Date(a.end_time).getTime() : 0;
    const bTime = b.end_time ? new Date(b.end_time).getTime() : 0;
    return bTime - aTime;
  });

  const snapshot = sortedSnapshots[0];

  if (!snapshot.end_time) {
    throw new Error(`Snapshot ${snapshot.snapshot} has no end_time - it may still be in progress`);
  }

  if (snapshot.state !== 'SUCCESS') {
    throw new Error(
      `Snapshot ${snapshot.snapshot} is not in SUCCESS state (current: ${snapshot.state})`
    );
  }

  const info: SnapshotInfo = {
    snapshot: snapshot.snapshot!,
    indices: snapshot.indices ?? [],
    startTime: String(snapshot.start_time ?? ''),
    endTime: String(snapshot.end_time),
    state: snapshot.state,
  };

  logger.info(`Found snapshot: ${info.snapshot} with ${info.indices.length} indices`);
  return info;
}

export async function deleteRepository({
  esClient,
  logger,
  repoName,
}: {
  esClient: Client;
  logger: Logger;
  repoName: string;
}): Promise<void> {
  try {
    await esClient.snapshot.deleteRepository({ name: repoName });
  } catch (error) {
    logger.debug(`Failed to delete repository: ${error}`);
  }
}
