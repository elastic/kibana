/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { Command } from 'commander';
import pLimit from 'p-limit';
import { partition } from 'lodash';
import { ensureLoghubRepo } from '../src/loghub/ensure_loghub_repo';
import { readLoghubSystemFiles } from '../src/loghub/read_loghub_system_files';
import { ensureValidParser } from '../src/loghub/ensure_valid_parser';
import { createOpenAIClient } from '../src/create_openai_client';
import { ensureValidQueries } from '../src/loghub/ensure_valid_queries';

async function run({ log }: { log: ToolingLog }) {
  await ensureLoghubRepo({ log });

  const systems = await readLoghubSystemFiles({ log });
  const limiter = pLimit(5);

  const openAIClient = createOpenAIClient();

  const results = await Promise.all(
    systems.map(async (system) => {
      return limiter(async () =>
        Promise.all([
          ensureValidParser({
            openAIClient,
            log,
            system,
          }),
          ensureValidQueries({
            openAIClient,
            system,
            log,
          }),
        ])
          .then(() => {
            return {
              name: system.name,
              error: null,
            };
          })
          .catch((error) => {
            return {
              name: system.name,
              error,
            };
          })
      );
    })
  );

  const [valid, invalid] = partition(results, (result) => !result.error);
  if (invalid.length === 0) {
    log.info(`Ensured ${valid.length} parsers`);
    return;
  }

  invalid.forEach((result) => {
    log.error(`Failed generating a valid parser for ${result.name}`);
    log.error(result.error);
  });

  throw new Error(`${invalid.length} out of ${results.length} parsers are invalid`);
}

export function cli() {
  const program = new Command('bin/kibana-setup');

  program
    .name('loghub-parser')
    .description(
      'Generates code to extract and replace timestamps in loglines from Loghub datasets'
    )
    .option('-d, --debug', 'Debug logging', false)
    .option('-v, --verbose', 'Verbose logging', false)
    .option('-s, --silent', 'Prevent all logging', false)
    .action(async () => {
      const options = program.opts() as {
        silent: boolean;
        verbose: boolean;
        debug: boolean;
      };

      const log = new ToolingLog({
        level: options.silent
          ? 'silent'
          : options.debug
          ? 'debug'
          : options.verbose
          ? 'verbose'
          : 'info',
        writeTo: process.stdout,
      });

      return run({ log });
    })
    .parse(process.argv);
}
