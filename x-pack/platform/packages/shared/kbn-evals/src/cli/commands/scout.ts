/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn } from 'child_process';
import type { Command } from '@kbn/dev-cli-runner';
import { SCOUT_EVALS_ARGS, parseConnectorsFromEnv } from '../prompts';

export const scoutCmd: Command<void> = {
  name: 'scout',
  description: `
  Start a Scout server pre-configured for evals (stateful/classic, evals_tracing).

  This is a convenience wrapper around:
    node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet evals_tracing

  Any extra flags are forwarded to Scout.

  Examples:
    node scripts/evals scout
    node scripts/evals scout --serverConfigSet custom_config
  `,
  flags: {
    allowUnexpected: true,
    guessTypesForUnexpectedFlags: true,
  },
  run: async ({ log, flagsReader }) => {
    const repoRoot = process.cwd();
    const extra = flagsReader.getPositionals();
    const args = ['scripts/scout.js', ...SCOUT_EVALS_ARGS, ...extra];

    const connectors = parseConnectorsFromEnv();
    if (connectors.length === 0) {
      log.warning(
        'KIBANA_TESTING_AI_CONNECTORS is not set. Connectors will not be preconfigured in Kibana.'
      );
      log.warning('Run `node scripts/evals init` first, then export the variable to this shell.');
      log.warning('');
    } else {
      log.info(`${connectors.length} connector(s) will be preconfigured in Kibana`);
    }

    log.info(`Running: node ${args.join(' ')}`);
    log.info('');

    await new Promise<void>((resolve, reject) => {
      const child = spawn('node', args, {
        cwd: repoRoot,
        stdio: 'inherit',
        env: process.env,
      });

      child.on('exit', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Scout exited with code ${code}`));
        }
      });
      child.on('error', reject);
    });
  },
};
