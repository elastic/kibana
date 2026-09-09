/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ConnectionConfig } from '../lib/connection_config';
import {
  CONNECTION_FAILURE,
  CONNECTION_HEALTHY,
  CONNECTION_WARNING,
  DB_SLOWNESS,
} from '../ground_truth';

interface AuditCorpusParams {
  esClient: Client;
  config: ConnectionConfig;
  log: ToolingLog;
}

interface PatternGroup {
  name: string;
  patterns: string[];
}

/**
 * Count documents matching a pattern phrase.
 */
async function countPattern(esClient: Client, index: string, pattern: string): Promise<number> {
  const response = await esClient.count({
    index,
    query: {
      match_phrase: {
        message: pattern,
      },
    },
  });
  return response.count;
}

/**
 * Audit the corpus to verify ground truth labels are present.
 *
 * Reports how many documents each label matches. Labels that match zero
 * documents are excluded from recall denominators by the eval task.
 */
export async function auditCorpus({ esClient, config, log }: AuditCorpusParams): Promise<void> {
  const index = config.sourceIndex;

  const groups: PatternGroup[] = [
    { name: 'CONNECTION_FAILURE', patterns: CONNECTION_FAILURE },
    { name: 'CONNECTION_HEALTHY', patterns: CONNECTION_HEALTHY },
    { name: 'CONNECTION_WARNING', patterns: CONNECTION_WARNING },
    { name: 'DB_SLOWNESS', patterns: DB_SLOWNESS },
  ];

  const presentLabels: Record<string, string[]> = {};
  let totalMissing = 0;

  for (const group of groups) {
    log.info(`\n${group.name}`);
    const found: string[] = [];

    for (const pattern of group.patterns) {
      const count = await countPattern(esClient, index, pattern);
      const marker = count > 0 ? '' : 'MISSING';
      log.info(`  ${String(count).padStart(5)} ${marker.padEnd(8)} ${pattern}`);

      if (count > 0) {
        found.push(pattern);
      } else {
        totalMissing++;
      }
    }

    presentLabels[group.name] = found;
  }

  // Summary
  const totalPatterns = groups.reduce((sum, g) => sum + g.patterns.length, 0);
  const presentCount = totalPatterns - totalMissing;

  log.info('\n--- Summary ---');
  log.info(`Total patterns: ${totalPatterns}`);
  log.info(`Present: ${presentCount}`);
  log.info(`Missing: ${totalMissing}`);

  if (totalMissing > 0) {
    log.warning(
      'Some patterns are missing from the corpus. ' +
        'This may be expected if the synthtrace scenario has changed. ' +
        'Missing patterns will be excluded from recall calculations.'
    );
  } else {
    log.success('All ground truth patterns are present in the corpus');
  }

  // Log the present labels for reference
  log.info('\nPresent labels (for eval task):');
  log.info(JSON.stringify(presentLabels, null, 2));
}
