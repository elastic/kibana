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
import { getConnectionConfig } from '../lib/get_connection_config';
import { createSnapshot, registerGcsRepository } from '../lib/gcs';

const DEFAULT_SYSTEM_INDICES = ['.kibana_streams_features-*', '.kibana_streams_assets-*'];

const DEFAULT_INDICES = ['logs.otel', '.internal.alerts-streams.alerts-default-*'];

function toSnapshotName(index: string): string {
  return `snapshot-${index.slice(1)}`;
}

async function fetchMapping(
  esClient: Client,
  indexName: string
): Promise<MappingTypeMapping | undefined> {
  const response = await esClient.indices.getMapping({ index: indexName });
  return response[indexName]?.mappings;
}

async function resolvePatterns(
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
      if (indices.length === 0) {
        log.warning(`No indices matched pattern "${pattern}" — skipping`);
      } else {
        for (const idx of indices) {
          log.info(`Resolved ${pattern} → ${idx}`);
        }
        resolved.push(...indices);
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

async function fetchAliases(
  esClient: Client,
  indexName: string
): Promise<Record<string, { is_write_index?: boolean; is_hidden?: boolean }>> {
  try {
    const response = await esClient.indices.getAlias({ index: indexName });
    return response[indexName]?.aliases ?? {};
  } catch {
    return {};
  }
}

async function captureSystemIndex(
  esClient: Client,
  log: ToolingLog,
  sourceIndex: string
): Promise<string> {
  const snapshotIndex = toSnapshotName(sourceIndex);

  const mappings = await fetchMapping(esClient, sourceIndex);
  if (!mappings) {
    throw new Error(`Could not fetch mapping for "${sourceIndex}"`);
  }

  await esClient.indices.delete({ index: snapshotIndex, ignore_unavailable: true });

  await esClient.indices.create({
    index: snapshotIndex,
    mappings,
  });

  const result = await esClient.reindex({
    wait_for_completion: true,
    source: { index: sourceIndex },
    dest: { index: snapshotIndex },
  });

  const created = result.created ?? 0;
  log.info(`Captured ${sourceIndex} → ${snapshotIndex} (${created} docs)`);

  return snapshotIndex;
}

function parseRepeatableFlag(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
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

  const snapshotName = String(flags['snapshot-name'] || '');
  const runId = String(flags['run-id'] || moment().format('YYYY-MM-DD'));

  const systemIndicesFlag = parseRepeatableFlag(flags['system-indices']);
  const systemIndexPatterns =
    systemIndicesFlag.length > 0 ? systemIndicesFlag : DEFAULT_SYSTEM_INDICES;

  const indicesFlag = parseRepeatableFlag(flags.indices);
  const indexPatterns = indicesFlag.length > 0 ? indicesFlag : DEFAULT_INDICES;

  if (!snapshotName) {
    throw new Error('Required: --snapshot-name <name>');
  }

  for (const pattern of systemIndexPatterns) {
    if (!pattern.startsWith('.kibana')) {
      throw new Error(
        `--system-indices patterns must start with ".kibana", got "${pattern}". ` +
          `Use --indices for non-system indices.`
      );
    }
  }

  log.info(`Snapshot: ${snapshotName} | Run: ${runId} | ES: ${config.esUrl}`);

  const resolvedSystemIndices = await resolvePatterns(esClient, log, systemIndexPatterns);
  const resolvedIndices = await resolvePatterns(esClient, log, indexPatterns);

  const allAliases: Array<{ index: string; alias: string; isHidden: boolean }> = [];

  const capturedSystemIndices: string[] = [];
  for (const idx of resolvedSystemIndices) {
    const snapshotIndex = await captureSystemIndex(esClient, log, idx);
    capturedSystemIndices.push(snapshotIndex);
    const aliases = await fetchAliases(esClient, idx);
    for (const [aliasName, aliasConfig] of Object.entries(aliases)) {
      allAliases.push({ index: idx, alias: aliasName, isHidden: !!aliasConfig.is_hidden });
    }
  }

  for (const idx of resolvedIndices) {
    const aliases = await fetchAliases(esClient, idx);
    for (const [aliasName, aliasConfig] of Object.entries(aliases)) {
      allAliases.push({ index: idx, alias: aliasName, isHidden: !!aliasConfig.is_hidden });
    }
  }

  const allSnapshotIndices = [...resolvedIndices, ...capturedSystemIndices].join(',');

  await registerGcsRepository(esClient, log, runId);
  await createSnapshot({ esClient, log, snapshotName, runId, indices: allSnapshotIndices });

  log.info(`Snapshot created: sigevents-${runId}/${snapshotName} (${allSnapshotIndices})`);

  if (capturedSystemIndices.length > 0) {
    log.info('');
    log.info(
      `Restore .kibana indices: --indices "${capturedSystemIndices.join(
        ','
      )}" --rename-pattern "snapshot-(.*)" --rename-replacement ".$1"`
    );
  }

  if (resolvedIndices.length > 0) {
    log.info('');
    log.info(`Replay data indices: --patterns "${resolvedIndices.join(',')}"`);
  }

  if (allAliases.length > 0) {
    log.info('');
    log.info(
      'After restore/replay, recreate aliases (.kibana aliases require a user with the system_indices_superuser role):'
    );
    for (const { index, alias, isHidden } of allAliases) {
      const hiddenFlag = isHidden ? ', "is_hidden": true' : '';
      log.info(
        `  POST _aliases { "actions": [{ "add": { "index": "${index}", "alias": "${alias}"${hiddenFlag} } }] }`
      );
    }
  }
}
