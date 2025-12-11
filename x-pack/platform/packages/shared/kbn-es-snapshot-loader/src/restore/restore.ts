/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import { extractDataStreamName } from '../utils';

export function filterIndicesToRestore(snapshotIndices: string[], patterns: string[]): string[] {
  return snapshotIndices.filter((index) => {
    const dataStreamName = extractDataStreamName(index);
    const namesToCheck = dataStreamName ? [index, dataStreamName] : [index];

    return patterns.some((pattern) => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return namesToCheck.some((name) => regex.test(name));
    });
  });
}

export async function restoreIndices({
  esClient,
  logger,
  repoName,
  snapshotName,
  indices,
  renamePattern,
  renameReplacement,
}: {
  esClient: Client;
  logger: Logger;
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
  logger.debug(`Restoring ${indices.length} indices${hasRename ? ' to temp location' : ''}`);

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

  logger.info(`Restore initiated for ${restoredNames.length} indices`);
  return restoredNames;
}
