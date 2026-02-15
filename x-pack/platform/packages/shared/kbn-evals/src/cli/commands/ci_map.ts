/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Command } from '@kbn/dev-cli-runner';
import { readSuiteMetadata } from '../suites';

export const ciMapCmd: Command<void> = {
  name: 'ci-map',
  description: `
  Output a CI label to command mapping for eval suites.

  Examples:
    node scripts/evals ci-map
    node scripts/evals ci-map --json
  `,
  flags: {
    boolean: ['json'],
    default: { json: false },
  },
  run: ({ log, flagsReader }) => {
    const suites = readSuiteMetadata(process.cwd(), log);
    const entries = [
      {
        label: 'evals:all',
        suiteId: '*',
        command: 'Add GH label evals:all to run all eval suites in PR CI',
      },
      ...suites.flatMap((suite) => {
        const labels = suite.ciLabels?.length ? suite.ciLabels : [`evals:${suite.id}`];
        return labels.map((label) => ({
          label,
          suiteId: suite.id,
          command: `EVALUATION_CONNECTOR_ID=<connector-id> node scripts/evals run --suite ${suite.id}`,
        }));
      }),
    ];

    if (flagsReader.boolean('json')) {
      process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
      return;
    }

    if (entries.length === 0) {
      log.warning('No eval suite metadata found to generate CI mapping.');
      return;
    }

    log.info('CI label mappings:');
    entries.forEach((entry) => {
      log.info(`- ${entry.label}: ${entry.command}`);
    });
  },
};
