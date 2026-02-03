/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Command } from '@kbn/dev-cli-runner';
import { readSuiteMetadata, resolveEvalSuites } from '../suites';

export const listSuitesCmd: Command<void> = {
  name: 'list',
  description: `
  List available evaluation suites.

  Examples:
    node scripts/evals list
    node scripts/evals list --refresh
    node scripts/evals list --json
  `,
  flags: {
    boolean: ['json', 'refresh'],
    default: { json: false, refresh: false },
  },
  run: async ({ log, flagsReader }) => {
    const repoRoot = process.cwd();
    const refresh = flagsReader.boolean('refresh');
    const metadata = readSuiteMetadata(repoRoot, log);

    if (!refresh && metadata.length > 0 && !flagsReader.boolean('json')) {
      log.info('Using cached suite metadata (fast). Run with --refresh to rescan configs.');
    }

    const formatTable = (rows: Array<{ id: string; tags: string[]; configPath: string }>) => {
      if (rows.length === 0) {
        return;
      }

      const idWidth = Math.max('Suite ID'.length, ...rows.map((row) => row.id.length));
      const tagsWidth = Math.max(
        'Tags'.length,
        ...rows.map((row) => (row.tags.length ? row.tags.join(', ').length : 1))
      );

      log.info(`${'Suite ID'.padEnd(idWidth)}  ${'Tags'.padEnd(tagsWidth)}  Config`);
      rows.forEach((row) => {
        const tags = row.tags.length ? row.tags.join(', ') : '-';
        log.info(`${row.id.padEnd(idWidth)}  ${tags.padEnd(tagsWidth)}  ${row.configPath}`);
      });
    };

    if (
      refresh &&
      metadata.length > 0 &&
      !flagsReader.boolean('json') &&
      process.env.KBN_EVALS_LIST_CACHE_PRINTED !== 'true'
    ) {
      log.info(`Cached suites (${metadata.length}):`);
      formatTable(metadata.map((suite) => ({ ...suite, tags: suite.tags ?? [] })));
      log.info('Refreshing suite discovery...');
    }

    const suites = resolveEvalSuites(repoRoot, log, { refresh });

    if (refresh && metadata.length > 0 && !flagsReader.boolean('json')) {
      const metadataConfigSet = new Set(metadata.map((entry) => entry.configPath));
      const missingMetadata = suites.filter((suite) => !metadataConfigSet.has(suite.configPath));

      if (missingMetadata.length > 0) {
        log.warning(
          `Discovered ${missingMetadata.length} suite(s) missing from evals.suites.json.`
        );
        log.info(`New suites (${missingMetadata.length}):`);
        formatTable(missingMetadata);
      } else {
        log.info('No new suites discovered.');
      }
      return;
    }

    if (flagsReader.boolean('json')) {
      process.stdout.write(`${JSON.stringify(suites, null, 2)}\n`);
      return;
    }

    if (suites.length === 0) {
      log.warning('No eval suites found.');
      return;
    }

    log.info(`Found ${suites.length} eval suite(s):`);
    formatTable(suites);
  },
};
