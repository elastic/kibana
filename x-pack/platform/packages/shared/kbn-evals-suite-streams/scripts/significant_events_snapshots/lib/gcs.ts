/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { GCS_BUCKET, GCS_BUCKET_FOLDER, OTEL_DEMO_NAMESPACE } from './constants';

export function generateGcsBasePath({
  runId,
  appNamespace,
}: {
  runId: string;
  appNamespace?: string;
}): string {
  if (appNamespace) {
    return `${GCS_BUCKET_FOLDER}/${appNamespace}/${runId}`;
  }

  // Defaults to the OTel Demo namespace when a custom app ID is not provided
  return `${GCS_BUCKET_FOLDER}/${OTEL_DEMO_NAMESPACE}/${runId}`;
}

export function generateGcsRepoName({ runId }: { runId: string }): string {
  return `sigevents-${runId}`;
}

export async function registerGcsRepository(
  esClient: Client,
  log: ToolingLog,
  runId: string
): Promise<void> {
  const repoName = generateGcsRepoName({ runId });
  const basePath = generateGcsBasePath({ runId });
  log.info(`Registering GCS snapshot repository "${repoName}" → ${GCS_BUCKET}/${basePath}`);

  await esClient.snapshot.createRepository({
    name: repoName,
    repository: { type: 'gcs', settings: { bucket: GCS_BUCKET, base_path: basePath } },
  });

  log.info('GCS repository registered');
}

export async function createSnapshot(
  esClient: Client,
  log: ToolingLog,
  snapshotName: string,
  runId: string
): Promise<void> {
  const repoName = generateGcsRepoName({ runId });
  const indices = 'logs*,.kibana_streams_features';
  log.info(`Creating snapshot "${repoName}/${snapshotName}" (indices: ${indices})`);

  const result = await esClient.snapshot.create({
    repository: repoName,
    snapshot: snapshotName,
    wait_for_completion: true,
    indices,
    include_global_state: false,
  });

  const shards = result.snapshot?.shards;
  log.info(
    `Snapshot "${snapshotName}" created — ${shards?.successful ?? '?'}/${
      shards?.total ?? '?'
    } shards`
  );
}
