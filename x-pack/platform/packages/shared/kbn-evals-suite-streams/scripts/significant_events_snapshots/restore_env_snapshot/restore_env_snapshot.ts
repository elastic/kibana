/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { Client } from '@elastic/elasticsearch';
import { createGcsRepository, replaySnapshot, restoreSnapshot } from '@kbn/es-snapshot-loader';
import { getConnectionConfig } from '../lib/get_connection_config';
import { GCS_BUCKET } from '../lib/constants';
import {
  createMissingAliases,
  parseRepeatableFlag,
  validateIndexPrivileges,
} from '../lib/snapshot_utils';

const DEFAULT_INDICES = ['logs.otel'];
const DEFAULT_SYSTEM_INDICES = ['.kibana_streams_features-*', '.kibana_streams_assets-*'];

export const restoreEnvSnapshot = async ({
  log,
  flags,
}: {
  log: ToolingLog;
  flags: Record<string, unknown>;
}): Promise<void> => {
  const config = await getConnectionConfig(flags, log);
  const esClient = new Client({
    node: config.esUrl,
    auth: { username: config.username, password: config.password },
  });

  const snapshotName = String(flags['snapshot-name'] || '');
  if (!snapshotName) {
    throw new Error('Required: --snapshot-name <name>');
  }

  const gcsBucket = String(flags['gcs-bucket'] || GCS_BUCKET);
  const gcsBasePath = String(flags['gcs-base-path'] || '');
  if (!gcsBasePath) {
    throw new Error('Required: --gcs-base-path <path>');
  }

  const indicesFlag = parseRepeatableFlag(flags.indices);
  const indices = indicesFlag.length > 0 ? indicesFlag : DEFAULT_INDICES;

  const systemIndicesFlag = parseRepeatableFlag(flags['system-indices']);
  const systemIndices = systemIndicesFlag.length > 0 ? systemIndicesFlag : DEFAULT_SYSTEM_INDICES;

  log.info(`Restore: ${snapshotName} | ES: ${config.esUrl}`);
  log.info(`GCS bucket: ${gcsBucket} | Base path: ${gcsBasePath}`);
  log.info(`Data indices: ${indices.join(', ')}`);
  log.info(`System indices: ${systemIndices.join(', ')}`);

  await validateIndexPrivileges(
    esClient,
    log,
    systemIndices,
    (missing) =>
      `Restore requires a user with manage privilege on system indices. ` +
      `Pass superuser credentials via --es-username/--es-password (e.g. the elastic user). ` +
      `Missing index:manage privilege on: ${missing}`
  );

  const repository = createGcsRepository({ bucket: gcsBucket, basePath: gcsBasePath });

  log.info('');
  log.info('Step 1/3 — Replaying data indices (with timestamp transformation)...');
  const replayResult = await replaySnapshot({
    esClient,
    log,
    repository,
    snapshotName,
    patterns: indices,
  });

  if (!replayResult.success) {
    throw new Error(
      `Failed to replay data indices from snapshot "${snapshotName}": ${replayResult.errors.join(
        '; '
      )}`
    );
  }

  log.info('');
  log.info('Step 2/3 — Restoring system indices (with rename snapshot-* → .*)...');
  const restoreResult = await restoreSnapshot({
    esClient,
    log,
    repository,
    snapshotName,
    indices: systemIndices,
    renamePattern: 'snapshot-(.*)',
    renameReplacement: '.$1',
  });

  if (!restoreResult.success) {
    throw new Error(
      `Failed to restore system indices from snapshot "${snapshotName}": ${restoreResult.errors.join(
        '; '
      )}`
    );
  }

  log.info('');
  log.info('Step 3/3 — Recreating missing .kibana system aliases...');
  await createMissingAliases({
    esClient,
    log,
    resolvedIndices: restoreResult.restoredIndices,
  });

  log.info('');
  log.info('='.repeat(70));
  log.info('RESTORE COMPLETE');
  log.info('='.repeat(70));
  log.info(`Snapshot: ${snapshotName}`);
  log.info(`Restored system indices: ${restoreResult.restoredIndices.join(', ')}`);
};
