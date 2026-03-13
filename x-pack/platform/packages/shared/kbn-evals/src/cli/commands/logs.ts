/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Command } from '@kbn/dev-cli-runner';
import { readState, isAlive, tailLog, type ServiceName } from '../services';

export const logsCmd: Command<void> = {
  name: 'logs',
  description: `
  Tail logs from backgrounded eval services.

  Shows live log output from EDOT and/or Scout. Press Ctrl+C to stop.

  Examples:
    node scripts/evals logs
    node scripts/evals logs --service scout
    node scripts/evals logs --service edot
    node scripts/evals logs --from-start
  `,
  flags: {
    string: ['service'],
    boolean: ['from-start'],
    default: { 'from-start': false },
  },
  run: async ({ log, flagsReader }) => {
    const repoRoot = process.cwd();
    const serviceName = flagsReader.string('service') as ServiceName | undefined;
    const fromStart = flagsReader.boolean('from-start');

    if (serviceName && serviceName !== 'edot' && serviceName !== 'scout') {
      throw new Error(`Unknown service "${serviceName}". Valid services: edot, scout`);
    }

    const state = readState(repoRoot);
    const services: ServiceName[] = serviceName ? [serviceName] : ['edot', 'scout'];
    const cleanups: Array<() => void> = [];

    for (const name of services) {
      const entry = state[name];
      if (!entry) {
        log.info(`[${name}] no tracked process`);
        continue;
      }

      const alive = isAlive(entry.pid);
      log.info(
        `[${name}] PID ${entry.pid} (${alive ? 'running' : 'stopped'}), log: ${entry.logFile}`
      );
      cleanups.push(tailLog(repoRoot, name, log, { fromStart }));
    }

    if (cleanups.length === 0) {
      log.info('No services to tail. Start services with: node scripts/evals start');
      return;
    }

    log.info('');
    log.info('Tailing logs... press Ctrl+C to stop.');
    log.info('');

    await new Promise<void>((resolve) => {
      const onSignal = () => {
        for (const cleanup of cleanups) cleanup();
        resolve();
      };
      process.on('SIGINT', onSignal);
      process.on('SIGTERM', onSignal);
    });
  },
};
