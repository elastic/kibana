/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import inquirer from 'inquirer';
import type { ToolingLog } from '@kbn/tooling-log';
import { Client, errors } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { createGcsRepository, replaySnapshot, restoreSnapshot } from '@kbn/es-snapshot-loader';
import { getConnectionConfig } from '../lib/get_connection_config';
import { GCS_BUCKET } from '../lib/constants';
import {
  createMissingAliases,
  parseCommonSnapshotFlags,
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
    } catch (err) {
      if (err instanceof errors.ResponseError && err.statusCode === 404) {
        continue;
      }
      throw err;
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
        const msg = err instanceof Error ? err.message : String(err);
        log.warning(`  failed to delete "${name}": ${msg}`);
        throw new Error(`Cannot continue restore: failed to delete "${name}": ${msg}`);
      }
    }
  }
}

async function extractMappingFromTempIndex(
  esClient: Client,
  log: ToolingLog,
  tempIndex: string
): Promise<MappingTypeMapping | undefined> {
  try {
    const response = await esClient.indices.getMapping({ index: tempIndex });
    const mapping = response[tempIndex]?.mappings;
    if (mapping) {
      log.info(`Extracted mapping from "${tempIndex}"`);
    }
    return mapping;
  } catch (err) {
    log.warning(
      `Failed to extract mapping from "${tempIndex}": ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return undefined;
  }
}

const DEFAULT_LOGS_MAPPING: MappingTypeMapping = { subobjects: false };

export async function ensureLogsIndexTemplate({
  esClient,
  log,
  indexPatterns,
  mappings,
}: {
  esClient: Client;
  log: ToolingLog;
  indexPatterns: string[];
  mappings?: MappingTypeMapping;
}): Promise<void> {
  log.info(
    `Creating temporary index template "${SIGEVENTS_INDEX_TEMPLATE}" for ${indexPatterns.join(
      ', '
    )}`
  );

  await esClient.indices.putIndexTemplate({
    name: SIGEVENTS_INDEX_TEMPLATE,
    index_patterns: indexPatterns,
    data_stream: {},
    template: {
      settings: {
        index: {
          mapping: {
            ignore_malformed: true,
          },
        },
      },
      mappings: mappings ?? DEFAULT_LOGS_MAPPING,
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

  const gcsBucket = String(flags['gcs-bucket'] || GCS_BUCKET);
  const gcsBasePath = String(flags['gcs-base-path'] || '');
  if (!gcsBasePath) {
    throw new Error('Required: --gcs-base-path <path>');
  }

  const clean = Boolean(flags.clean);
  const { snapshotName, systemIndices, alertIndices, logsIndex } = parseCommonSnapshotFlags(flags);

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

  // System indices are captured as snapshot-* (e.g. .kibana_streams_features → snapshot-kibana_streams_features)
  // so we must match the snapshot-* names and rename them back on restore.
  const snapshotSystemIndices = systemIndices.map((p) => `snapshot-${p.slice(1)}`);

  log.info('');
  log.info('Step 1/3 — Restoring system indices (with rename snapshot-* → .*)...');
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
  log.info('Step 2/3 — Replaying data indices (with timestamp transformation)...');
  const replayResult = await replaySnapshot({
    esClient,
    log,
    repository,
    snapshotName,
    patterns: [logsIndex, ...alertIndices],
    async beforeReindex({
      esClient: client,
      log: logger,
      originalIndices,
      restoredIndices,
      destinationIndices,
    }) {
      const logsTempIndex = originalIndices.reduce<string | undefined>((found, orig, i) => {
        if (found) {
          return found;
        }
        return orig.includes(logsIndex) ? restoredIndices[i] : undefined;
      }, undefined);

      const mapping = logsTempIndex
        ? await extractMappingFromTempIndex(client, logger, logsTempIndex)
        : undefined;

      await ensureLogsIndexTemplate({
        esClient: client,
        log: logger,
        indexPatterns: destinationIndices,
        mappings: mapping,
      });

      for (const dest of destinationIndices) {
        try {
          await client.indices.createDataStream({ name: dest });
          logger.info(`Created data stream "${dest}"`);
        } catch (err) {
          logger.debug(
            `Data stream "${dest}" already exists or could not be created: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }
    },
  });

  log.info('');
  log.info('Cleaning up temporary index template...');
  try {
    await esClient.indices.deleteIndexTemplate({ name: SIGEVENTS_INDEX_TEMPLATE });
    log.debug(`Deleted temporary index template "${SIGEVENTS_INDEX_TEMPLATE}"`);
  } catch (err) {
    log.warning(
      `Failed to delete temporary index template "${SIGEVENTS_INDEX_TEMPLATE}": ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }

  if (!replayResult.success) {
    throw new Error(
      `Failed to replay data indices from snapshot "${snapshotName}": ${replayResult.errors.join(
        '; '
      )}`
    );
  }

  log.info('');
  log.info('Step 3/3 — Recreating missing aliases...');
  await createMissingAliases({
    esClient,
    log,
    resolvedIndices: [...restoreResult.restoredIndices, ...(replayResult.reindexedIndices ?? [])],
  });

  log.info('');
  log.info('='.repeat(70));
  log.info('RESTORE COMPLETE');
  log.info('='.repeat(70));
  log.info(`Snapshot: ${snapshotName}`);
  log.info(`Restored system indices: ${restoreResult.restoredIndices.join(', ')}`);
  log.info(`Replayed data indices: ${replayResult.restoredIndices.join(', ')}`);
};
