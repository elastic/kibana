/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { Client } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import moment from 'moment';
import type { ConnectionConfig } from '../lib/get_connection_config';
import { getConnectionConfig } from '../lib/get_connection_config';
import { createSnapshot, generateGcsBasePath, registerGcsRepository } from '../lib/gcs';
import { GCS_BUCKET } from '../lib/constants';
import { resolvePatterns, parseCommonSnapshotFlags, toSnapshotName } from '../lib/snapshot_utils';
import { withTempSuperuser } from '../lib/user_utils';

async function fetchMapping(
  esClient: Client,
  indexName: string
): Promise<MappingTypeMapping | undefined> {
  const response = await esClient.indices.getMapping({ index: indexName });
  return response[indexName]?.mappings;
}

async function captureSystemIndex({
  esClient,
  log,
  config,
  sourceIndex,
}: {
  esClient: Client;
  config: ConnectionConfig;
  log: ToolingLog;
  sourceIndex: string;
}): Promise<string> {
  return withTempSuperuser(esClient, log, config, async (sysClient) => {
    const snapshotIndex = toSnapshotName(sourceIndex);

    const mappings = await fetchMapping(sysClient, sourceIndex);
    if (!mappings) {
      throw new Error(`Could not fetch mapping for "${sourceIndex}"`);
    }

    await sysClient.indices.delete({ index: snapshotIndex, ignore_unavailable: true });

    await sysClient.indices.create({
      index: snapshotIndex,
      mappings,
    });

    const result = await sysClient.reindex(
      {
        wait_for_completion: true,
        source: { index: sourceIndex },
        dest: { index: snapshotIndex },
      },
      { requestTimeout: 30 * 60 * 1000 }
    );

    if (result.timed_out) {
      throw new Error(`Reindex timed out capturing "${sourceIndex}"`);
    }

    const failures = result.failures ?? [];
    if (failures.length > 0) {
      throw new Error(
        `Reindex had ${failures.length} failure(s) capturing "${sourceIndex}": ${failures
          .slice(0, 3)
          .map((f) => f.cause?.reason ?? 'unknown')
          .join('; ')}`
      );
    }

    const created = result.created ?? 0;
    log.info(`Captured ${sourceIndex} → ${snapshotIndex} (${created} docs)`);

    return snapshotIndex;
  });
}

export async function captureEnvSnapshot({
  log,
  flags,
}: {
  log: ToolingLog;
  flags: Record<string, unknown>;
}): Promise<void> {
  const config = await getConnectionConfig(flags, log);
  const esClient = new Client({
    node: config.esUrl,
    auth: { username: config.username, password: config.password },
  });

  const runId = String(flags['run-id'] || moment().format('YYYY-MM-DD'));
  const { snapshotName, systemIndices, alertIndices, logsIndex } = parseCommonSnapshotFlags(flags);

  log.info(`Snapshot: ${snapshotName} | Run: ${runId} | ES: ${config.esUrl}`);

  const resolvedSystemIndices = await resolvePatterns(esClient, log, systemIndices);
  const resolvedIndices = await resolvePatterns(esClient, log, [logsIndex, ...alertIndices]);

  const capturedSystemIndices: string[] = [];
  for (const idx of resolvedSystemIndices) {
    const snapshotIndex = await captureSystemIndex({ esClient, config, log, sourceIndex: idx });

    capturedSystemIndices.push(snapshotIndex);
  }

  const allSnapshotIndices = [...resolvedIndices, ...capturedSystemIndices].join(',');

  await registerGcsRepository(esClient, log, runId);
  await createSnapshot({ esClient, log, snapshotName, runId, indices: allSnapshotIndices });

  log.info(`Snapshot created: sigevents-${runId}/${snapshotName} (${allSnapshotIndices})`);

  log.info('');
  log.info('='.repeat(70));
  log.info('SNAPSHOT CREATED — next steps:');
  log.info('='.repeat(70));

  const gcsBasePath = generateGcsBasePath({ runId });

  log.info('');
  log.info('Restore this snapshot to replay the environment:');
  log.info(
    `  node scripts/restore_sigevents_env_snapshot.js \\\n` +
      `  --gcs-bucket ${GCS_BUCKET} \\\n` +
      `  --gcs-base-path ${gcsBasePath} \\\n` +
      `  --snapshot-name ${snapshotName}`
  );
}
