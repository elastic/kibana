/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import inquirer from 'inquirer';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ConnectionConfig } from './get_connection_config';
import { kibanaRequest } from './kibana';
import {
  DEFAULT_ENV_SNAPSHOT_LOGS_INDEX,
  INDEX_ALIAS_CONFIG,
  VALID_ALERT_INDICES,
  VALID_SYSTEM_INDICES,
} from './constants';

export const parseRepeatableFlag = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
};

export interface CommonSnapshotFlags {
  snapshotName: string;
  systemIndices: string[];
  alertIndices: string[];
  logsIndex: string;
}

export const parseCommonSnapshotFlags = (flags: Record<string, unknown>): CommonSnapshotFlags => {
  const snapshotName = String(flags['snapshot-name'] || '');
  if (!snapshotName) {
    throw new Error('Required: --snapshot-name <name>');
  }

  const systemIndicesFlag = parseRepeatableFlag(flags['system-indices']);
  const systemIndices =
    systemIndicesFlag.length > 0 ? systemIndicesFlag : [...VALID_SYSTEM_INDICES];

  const validSystemSet = new Set<string>(VALID_SYSTEM_INDICES);
  for (const pattern of systemIndices) {
    if (!validSystemSet.has(pattern)) {
      throw new Error(
        `Invalid --system-indices value "${pattern}". ` +
          `Allowed values: ${VALID_SYSTEM_INDICES.join(', ')}`
      );
    }
  }

  const alertIndicesFlag = parseRepeatableFlag(flags['alert-indices']);
  const alertIndices = alertIndicesFlag.length > 0 ? alertIndicesFlag : [...VALID_ALERT_INDICES];

  const validAlertSet = new Set<string>(VALID_ALERT_INDICES);
  for (const idx of alertIndices) {
    if (!validAlertSet.has(idx)) {
      throw new Error(
        `Invalid --alert-indices value "${idx}". ` +
          `Allowed values: ${VALID_ALERT_INDICES.join(', ')}`
      );
    }
  }

  const logsIndex = String(flags['logs-index'] || DEFAULT_ENV_SNAPSHOT_LOGS_INDEX);

  return { snapshotName, systemIndices, alertIndices, logsIndex };
};

export async function resolvePatterns(
  esClient: Client,
  log: ToolingLog,
  patterns: string[]
): Promise<string[]> {
  const resolved: string[] = [];

  for (const pattern of patterns) {
    if (!pattern.includes('*')) {
      resolved.push(pattern);
      continue;
    }

    try {
      const response = await esClient.indices.resolveIndex({
        name: pattern,
        expand_wildcards: 'all',
      });

      const indices = (response.indices ?? []).map((idx) => idx.name);
      const dataStreamNames = (response.data_streams ?? []).map((ds) => ds.name);

      if (indices.length === 0 && dataStreamNames.length === 0) {
        log.warning(`No indices matched pattern "${pattern}" — skipping`);
      } else {
        for (const idx of indices) {
          log.info(`Resolved ${pattern} → ${idx}`);
        }
        for (const ds of dataStreamNames) {
          log.info(`Resolved ${pattern} → ${ds} (data stream)`);
        }
        resolved.push(...indices, ...dataStreamNames);
      }
    } catch (err) {
      if (err instanceof errors.ResponseError && err.statusCode === 404) {
        log.warning(`No indices matched pattern "${pattern}" — skipping`);
        continue;
      }
      throw err;
    }
  }

  return resolved;
}

export const validateIndexPrivileges = async (
  esClient: Client,
  log: ToolingLog,
  patterns: string[],
  onUnauthorized: (missing: string) => string
): Promise<void> => {
  // Superusers bypass index-level privilege checks at operation time, but
  // has_privileges returns false for restricted index wildcards even for
  // superusers. Check for the superuser role first and skip the index check.
  const authInfo = await esClient.security.authenticate();
  const roles: string[] = authInfo.roles ?? [];
  if (roles.includes('superuser')) {
    log.debug('Superuser detected — skipping index privilege check');
    return;
  }

  const privResult = await esClient.security.hasPrivileges({
    index: [{ names: patterns, privileges: ['manage'], allow_restricted_indices: true }],
  });

  if (!privResult.has_all_requested) {
    const missing = Object.entries(privResult.index ?? {})
      .filter(([, privs]) => !Object.values(privs as Record<string, boolean>).every(Boolean))
      .map(([idx]) => idx);
    throw new Error(onUnauthorized(missing.length > 0 ? missing.join(', ') : patterns.join(', ')));
  }

  log.debug('Index privilege check passed');
};

export const ensureKnownAliases = async ({
  esClient,
  log,
  systemIndices,
  alertIndices,
}: {
  esClient: Client;
  log: ToolingLog;
  systemIndices: string[];
  alertIndices: string[];
}): Promise<void> => {
  let created = 0;
  let skipped = 0;

  for (const indexPattern of [...systemIndices, ...alertIndices]) {
    const config = INDEX_ALIAS_CONFIG[indexPattern as keyof typeof INDEX_ALIAS_CONFIG];
    if (!config?.alias) {
      log.warning(`No alias config for "${indexPattern}" — skipping`);
      continue;
    }

    const { alias: aliasName } = config;

    const aliasExists = await esClient.indices.existsAlias({ name: aliasName });
    if (aliasExists) {
      log.debug(`Alias "${aliasName}" already exists — skipping`);
      skipped++;
      continue;
    }

    try {
      const resolved = await esClient.indices.resolveIndex({
        name: indexPattern,
        expand_wildcards: 'all',
      });
      const concreteIndex = resolved.indices?.[0]?.name;
      if (!concreteIndex) {
        log.debug(`No index found for pattern "${indexPattern}" — skipping alias`);
        continue;
      }

      log.info(`Creating alias "${aliasName}" → "${concreteIndex}"`);
      await esClient.indices.updateAliases({
        actions: [{ add: { index: concreteIndex, is_write_index: true, ...config } }],
      });
      created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Alias creation failed for "${indexPattern}": ${msg}`);
    }
  }

  log.info(`Aliases: ${created} created, ${skipped} already existed`);
};

export async function resolveExisting(esClient: Client, patterns: string[]): Promise<string[]> {
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

export async function deleteExisting(
  esClient: Client,
  log: ToolingLog,
  names: string[]
): Promise<void> {
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

async function promptConfirm(question: string): Promise<boolean> {
  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    { type: 'confirm', name: 'confirmed', message: question, default: false },
  ]);
  return confirmed;
}

export async function ensureCleanEnvironment({
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

export async function getEnabledStreams(esClient: Client, log: ToolingLog): Promise<string[]> {
  try {
    const response = (await esClient.transport.request({
      method: 'GET',
      path: '/_streams/status',
    })) as Record<string, { enabled?: boolean }>;

    const enabled = Object.entries(response)
      .filter(([, v]) => v?.enabled)
      .map(([name]) => name);

    if (enabled.length > 0) {
      log.info(`Enabled ES streams: ${enabled.join(', ')}`);
    }
    return enabled;
  } catch {
    log.debug('GET /_streams/status not available — no pipeline exclusions');
    return [];
  }
}

export async function ensureStreamsEnabled(
  config: ConnectionConfig,
  log: ToolingLog
): Promise<void> {
  const { status, data } = await kibanaRequest(config, 'POST', '/api/streams/_enable');
  if (status === 200) {
    log.info('Streams enabled successfully');
  } else if (status === 400) {
    const msg = JSON.stringify(data ?? '');
    if (msg.includes('already enabled') || msg.includes('Cannot change stream types')) {
      log.info('Streams already enabled');
    } else {
      throw new Error(`Failed to enable streams: ${status} ${msg}`);
    }
  } else if (status === 404) {
    log.warning('Streams API not available — skipping');
  } else {
    throw new Error(`Failed to enable streams: ${status} ${JSON.stringify(data)}`);
  }
}
