/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn } from 'child_process';
import type { Command } from '@kbn/dev-cli-runner';
import { scoutEvalsArgs, parseConnectorsFromEnv } from '../prompts';
import { envFromDatasetsProfile } from '../profiles';
import { ensureSuite } from '../run_helpers';
import { resolveScoutTarget } from '../scout_target';

export const scoutCmd: Command<void> = {
  name: 'scout',
  description: `
  Start a Scout server pre-configured for evals (stateful/classic, evals_tracing by default).

  This is a convenience wrapper around:
    node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet evals_tracing

  --suite uses the suite's serverConfigSet and scoutArch/scoutDomain from evals.suites.json;
  --serverConfigSet, --arch and --domain override them. Positional arguments are forwarded to Scout.

  Examples:
    node scripts/evals scout
    node scripts/evals scout --serverConfigSet custom_config
    node scripts/evals scout --suite nightshift-investigations
    node scripts/evals scout --arch serverless --domain observability_complete
  `,
  flags: {
    string: ['suite', 'serverConfigSet', 'arch', 'domain'],
    allowUnexpected: true,
    guessTypesForUnexpectedFlags: true,
  },
  run: async ({ log, flagsReader }) => {
    const repoRoot = process.cwd();
    const suiteId = flagsReader.string('suite');
    const suite = suiteId ? ensureSuite(suiteId, repoRoot, log) : undefined;

    const scoutTarget = resolveScoutTarget(suite, {
      arch: flagsReader.string('arch'),
      domain: flagsReader.string('domain'),
    });
    const serverConfigSet = flagsReader.string('serverConfigSet') ?? suite?.serverConfigSet;
    const args = [
      'scripts/scout.js',
      ...scoutEvalsArgs(serverConfigSet, scoutTarget),
      ...flagsReader.getPositionals(),
    ];

    const connectors = parseConnectorsFromEnv();
    if (connectors.length === 0) {
      log.warning(
        'No connectors found. Set KIBANA_TESTING_INFERENCE_ENDPOINTS. Connectors will not be preconfigured in Kibana.'
      );
      log.warning('Run `node scripts/evals init` first, then export the variable to this shell.');
      log.warning('');
    } else {
      log.info(`${connectors.length} connector(s) will be preconfigured in Kibana`);
    }

    log.info(`Running: node ${args.join(' ')}`);
    log.info('');

    await new Promise<void>((resolve, reject) => {
      const childEnv: Record<string, string> = {
        ...process.env,
        ...envFromDatasetsProfile(repoRoot),
      } as Record<string, string>;
      const child = spawn('node', args, {
        cwd: repoRoot,
        stdio: 'inherit',
        env: childEnv,
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
