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
}: {
  esClient: Client;
  log: ToolingLog;
  repoName: string;
  snapshotName: string;
  indices: string[];
  renamePattern?: string;
  renameReplacement?: string;
}): Promise<string[]> {
  if (indices.length === 0) {
    throw new Error('No indices specified for restore');
  }

  const hasRename = renamePattern && renameReplacement;
  log.debug(`Restoring ${indices.length} indices${hasRename ? ' to temp location' : ''}`);

  await esClient.snapshot.restore({
    repository: repoName,
    snapshot: snapshotName,
    wait_for_completion: true,
    indices: indices.join(','),
    include_global_state: false,
    ...(hasRename && { rename_pattern: renamePattern, rename_replacement: renameReplacement }),
  });

  const restoredNames = hasRename
    ? indices.map((idx) => idx.replace(new RegExp(renamePattern), renameReplacement))
    : indices;

  log.info(`Restore initiated for ${restoredNames.length} indices`);
  return restoredNames;
}
