/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import inquirer from 'inquirer';
import type { ToolingLog } from '@kbn/tooling-log';
import { Client } from '@elastic/elasticsearch';
import { createGcsRepository, replaySnapshot, restoreSnapshot } from '@kbn/es-snapshot-loader';
import { getConnectionConfig } from '../lib/get_connection_config';
import {
  GCS_BUCKET,
  DEFAULT_ALERT_INDICES,
  DEFAULT_SYSTEM_INDICES,
  DEFAULT_ENV_SNAPSHOT_LOGS_INDEX,
} from '../lib/constants';
import {
  createMissingAliases,
  parseRepeatableFlag,
  validateIndexPrivileges,
} from '../lib/snapshot_utils';

const SIGEVENTS_INDEX_TEMPLATE = 'sigevents-logs-template';

async function promptConfirm(question: string): Promise<boolean> {
  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    { type: 'confirm', name: 'confirmed', message: question, default: false },
  ]);
  return confirmed;
}

async function resolveExisting(esClient: Client, patterns: string[]): Promise<string[]> {
  const found: string[] = [];
  for (const pattern of patterns) {
    try {
      const response = await esClient.indices.resolveIndex({
        name: pattern,
        expand_wildcards: 'all',
      });
      found.push(
        ...(response.indices ?? []).map((i) => i.name),
        ...(response.data_streams ?? []).map((d) => d.name)
      );
    } catch {
      // not found — skip
    }
  }
  return found;
}

async function deleteExisting(esClient: Client, log: ToolingLog, names: string[]): Promise<void> {
  for (const name of names) {
    try {
      await esClient.indices.deleteDataStream({ name });
      log.info(`  deleted data stream: ${name}`);
    } catch (dsErr) {
      log.debug(
        `  not a data stream "${name}" (${
          dsErr instanceof Error ? dsErr.message : String(dsErr)
        }) — trying index delete`
      );
      try {
        await esClient.indices.delete({ index: name, ignore_unavailable: true });
        log.info(`  deleted index: ${name}`);
      } catch (err) {
        log.warning(
          `  failed to delete "${name}": ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }
}

export async function ensureLogsIndexTemplate({
  esClient,
  log,
  streamName,
}: {
  esClient: Client;
  log: ToolingLog;
  streamName: string;
}): Promise<void> {
  log.debug(`Creating index template "${streamName}"`);

  await esClient.indices.putIndexTemplate({
    name: SIGEVENTS_INDEX_TEMPLATE,
    index_patterns: [streamName],
    data_stream: {},
    template: {
      settings: {
        index: {
          mapping: {
            ignore_malformed: true,
          },
        },
      },
      mappings: {
        subobjects: false,
      },
    },
    priority: 500,
  });
}

async function ensureCleanEnvironment({
  esClient,
  log,
  systemIndices,
  alertIndices,
  logsIndex,
  clean,
}: {
  esClient: Client;
  log: ToolingLog;
  systemIndices: string[];
  alertIndices: string[];
  logsIndex: string;
  clean: boolean;
}): Promise<void> {
  const allExisting = await resolveExisting(esClient, [
    logsIndex,
    ...systemIndices,
    ...alertIndices,
  ]);

  if (allExisting.length === 0) {
    log.debug('Environment is clean — no existing indices found');
    return;
  }

  log.warning('Found existing indices that will conflict with the restore:');
  for (const name of allExisting) {
    log.warning(`  - ${name}`);
  }

  if (!clean) {
    if (!process.stdin.isTTY) {
      throw new Error(
        `Environment is not clean. Re-run with --clean to automatically delete the listed indices, or delete them manually before restoring.`
      );
    }

    const confirmed = await promptConfirm(
      `This will permanently delete all existing Streams and Significant Events data (${allExisting.length} indices listed above) and replace it with the snapshot contents. Proceed?`
    );
    if (!confirmed) {
      throw new Error(
        `Restore aborted. Delete the listed indices manually or re-run with --clean.`
      );
    }
  }

  log.info('Cleaning up environment...');
  await deleteExisting(esClient, log, allExisting);
}

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

  const clean = Boolean(flags.clean);

  const logsIndex = String(flags['logs-index'] || DEFAULT_ENV_SNAPSHOT_LOGS_INDEX);

  const alertIndicesFlag = parseRepeatableFlag(flags['alert-indices']);
  const alertIndices = alertIndicesFlag.length > 0 ? alertIndicesFlag : DEFAULT_ALERT_INDICES;

  const systemIndicesFlag = parseRepeatableFlag(flags['system-indices']);
  const systemIndices = systemIndicesFlag.length > 0 ? systemIndicesFlag : DEFAULT_SYSTEM_INDICES;

  log.info(`Restore: ${snapshotName} | ES: ${config.esUrl}`);
  log.info(`GCS bucket: ${gcsBucket} | Base path: ${gcsBasePath}`);
  log.info(`Data indices: ${[logsIndex, ...alertIndices].join(', ')}`);
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

  await ensureCleanEnvironment({ esClient, log, systemIndices, alertIndices, logsIndex, clean });
  await ensureLogsIndexTemplate({ esClient, log, streamName: logsIndex });

  log.info('');
  log.info('Step 1/3 — Replaying data indices (with timestamp transformation)...');
  const replayResult = await replaySnapshot({
    esClient,
    log,
    repository,
    snapshotName,
    patterns: [logsIndex, ...alertIndices],
  });

  if (!replayResult.success) {
    throw new Error(
      `Failed to replay data indices from snapshot "${snapshotName}": ${replayResult.errors.join(
        '; '
      )}`
    );
  }

  // System indices are captured as snapshot-* (e.g. .kibana_streams_features → snapshot-kibana_streams_features)
  // so we must match the snapshot-* names and rename them back on restore.
  const snapshotSystemIndices = systemIndices.map((p) => `snapshot-${p.slice(1)}`);

  log.info('');
  log.info('Step 2/3 — Restoring system indices (with rename snapshot-* → .*)...');
  const restoreResult = await restoreSnapshot({
    esClient,
    log,
    repository,
    snapshotName,
    indices: snapshotSystemIndices,
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
