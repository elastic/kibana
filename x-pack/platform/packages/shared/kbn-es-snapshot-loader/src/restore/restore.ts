/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { extractDataStreamName } from '../utils';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileGlobPatterns(patterns: string[]): RegExp[] {
  return patterns.map((pattern) => {
    const escaped = escapeRegExp(pattern).replace(/\\\*/g, '.*');
    return new RegExp(`^${escaped}$`);
  });
}

export function filterIndicesToRestore(snapshotIndices: string[], patterns: string[]): string[] {
  const compiledPatterns = compileGlobPatterns(patterns);

  return snapshotIndices.filter((index) => {
    const dataStreamName = extractDataStreamName(index);
    const namesToCheck = dataStreamName ? [index, dataStreamName] : [index];

    return compiledPatterns.some((regex) => namesToCheck.some((name) => regex.test(name)));
  });
}

export async function restoreIndices({
  esClient,
  log,
  repoName,
  snapshotName,
  indices,
  renamePattern,
  renameReplacement,
  indexSettings,
}: {
  esClient: Client;
  log: ToolingLog;
  repoName: string;
  snapshotName: string;
  indices: string[];
  renamePattern?: string;
  renameReplacement?: string;
  indexSettings?: Record<string, unknown>;
}): Promise<string[]> {
  if (indices.length === 0) {
    throw new Error('No indices specified for restore');
  }

  const hasRename = renamePattern && renameReplacement;
  log.debug(`Restoring ${indices.length} indices${hasRename ? ' to temp location' : ''}`);

  const restoreResponse = await esClient.snapshot.restore(
    {
      repository: repoName,
      snapshot: snapshotName,
      wait_for_completion: true,
      indices: indices.join(','),
      include_global_state: false,
      ...(hasRename && { rename_pattern: renamePattern, rename_replacement: renameReplacement }),
      ...(indexSettings !== undefined && { index_settings: indexSettings }),
    },
    { requestTimeout: 5 * 60 * 1000 }
  );

  let restoredNames = restoreResponse.snapshot?.indices;
  if (indexSettings === undefined) {
    restoredNames = hasRename
      ? indices.map((index) => index.replace(new RegExp(renamePattern), renameReplacement))
      : indices;
  }

  if (!restoredNames || restoredNames.length === 0) {
    throw new Error('Snapshot restore response did not include restored index names');
  }

  log.info(`Restore initiated for ${restoredNames.length} indices`);
  return restoredNames;
}

export async function waitForRestoredIndicesToBeActive({
  esClient,
  restoredIndices,
}: {
  esClient: Client;
  restoredIndices: string[];
}): Promise<void> {
  const health = await esClient.cluster.health(
    {
      index: restoredIndices.join(','),
      wait_for_active_shards: 'all',
      timeout: '120s',
    },
    { ignore: [408], requestTimeout: 130_000 }
  );

  if (health.timed_out) {
    throw new Error(
      `Restored indices did not become active within 120 seconds: ${restoredIndices.join(', ')}`
    );
  }
}
