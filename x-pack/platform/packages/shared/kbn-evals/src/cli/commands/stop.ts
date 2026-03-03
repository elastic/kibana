/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Command } from '@kbn/dev-cli-runner';
import { stopAll, stopService, readState, isAlive, type ServiceName } from '../services';

export const stopCmd: Command<void> = {
  name: 'stop',
  description: `
  Stop backgrounded eval services (EDOT collector, Scout server).

  With no arguments, stops all managed services.
  Pass --service to stop a specific one.

  Examples:
    node scripts/evals stop
    node scripts/evals stop --service scout
    node scripts/evals stop --service edot
  `,
  flags: {
    string: ['service'],
  },
  run: async ({ log, flagsReader }) => {
    const repoRoot = process.cwd();
    const serviceName = flagsReader.string('service') as ServiceName | undefined;

    if (serviceName) {
      if (serviceName !== 'edot' && serviceName !== 'scout') {
        throw new Error(`Unknown service "${serviceName}". Valid services: edot, scout`);
      }
      await stopService(repoRoot, serviceName, log);
    } else {
      const state = readState(repoRoot);
      const edotAlive = state.edot && isAlive(state.edot.pid);
      const scoutAlive = state.scout && isAlive(state.scout.pid);

      if (!edotAlive && !scoutAlive) {
        log.info('No managed services are running.');
        return;
      }

      await stopAll(repoRoot, log);
      log.info('All eval services stopped.');
    }
  },
};
