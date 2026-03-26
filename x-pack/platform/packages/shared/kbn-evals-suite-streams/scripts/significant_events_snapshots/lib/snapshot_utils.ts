/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  DEFAULT_ALERT_INDICES,
  DEFAULT_SYSTEM_INDICES,
  DEFAULT_ENV_SNAPSHOT_LOGS_INDEX,
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
  const systemIndices = systemIndicesFlag.length > 0 ? systemIndicesFlag : DEFAULT_SYSTEM_INDICES;

  for (const pattern of systemIndices) {
    if (!pattern.startsWith('.kibana')) {
      throw new Error(
        `--system-indices patterns must start with ".kibana", got "${pattern}". ` +
          `Only .kibana system indices are supported.`
      );
    }
  }

  const alertIndicesFlag = parseRepeatableFlag(flags['alert-indices']);
  const alertIndices = alertIndicesFlag.length > 0 ? alertIndicesFlag : DEFAULT_ALERT_INDICES;

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
      log.warning(
        `Failed to resolve pattern "${pattern}" — skipping: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
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

const ALIAS_REGEX = /^(?:\.internal)?(.+)-\d+$/;

const deriveAliasName = (indexName: string): string | undefined => {
  const match = indexName.match(ALIAS_REGEX);
  return match ? match[1] : undefined;
};

async function resolveDataStreamIndices(esClient: Client, indices: string[]): Promise<Set<string>> {
  const result = new Set<string>();
  if (indices.length === 0) return result;

  try {
    const response = await esClient.indices.get({
      index: indices,
      filter_path: '*.data_stream',
    });
    for (const [name, meta] of Object.entries(response)) {
      if (meta.data_stream) {
        result.add(name);
      }
    }
  } catch (err) {
    if (err instanceof errors.ResponseError && err.statusCode === 404) {
      return result;
    }
    throw err;
  }

  return result;
}

export const createMissingAliases = async ({
  esClient,
  log,
  resolvedIndices,
}: {
  esClient: Client;
  log: ToolingLog;
  resolvedIndices: string[];
}): Promise<void> => {
  const indicesWithAliases = resolvedIndices.filter((name) => deriveAliasName(name) != null);
  const dataStreamIndices = await resolveDataStreamIndices(esClient, indicesWithAliases);

  log.debug(`Indices needing aliases: ${indicesWithAliases.join(', ')}`);
  log.debug(`Data stream backed indices: ${[...dataStreamIndices].join(', ') || 'none'}`);

  let created = 0;
  let skipped = 0;

  for (const indexName of indicesWithAliases) {
    const aliasName = deriveAliasName(indexName)!;
    const isDataStream = dataStreamIndices.has(indexName);

    const aliasExists = await esClient.indices.existsAlias({ name: aliasName });
    if (aliasExists) {
      log.debug(`Alias "${aliasName}" already exists — skipping`);
      skipped++;
      continue;
    }

    log.info(
      `Creating alias "${aliasName}" → "${indexName}"${isDataStream ? ' (data stream)' : ''}`
    );
    await esClient.indices.updateAliases({
      actions: [
        {
          add: isDataStream
            ? { index: indexName, alias: aliasName, is_write_index: true }
            : { index: indexName, alias: aliasName, is_write_index: true, is_hidden: true },
        },
      ],
    });
    created++;
  }

  log.info(`Aliases complete: ${created} created, ${skipped} already existed`);
};
