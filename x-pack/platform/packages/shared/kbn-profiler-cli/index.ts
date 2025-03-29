/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { run } from '@kbn/dev-cli-runner';
import { compact, once, uniq } from 'lodash';
import { getKibanaProcessId } from './src/get_kibana_process_id';
import { runCommand } from './src/run_command';
import { getPipedInput } from './src/get_piped_input';
import { runUntilSigInt } from './src/run_until_sigint';
import { getProfiler } from './src/get_profiler';

export function cli() {
  run(
    async ({ flags, log, addCleanupTask }) => {
      const piped = await getPipedInput();
      const command = piped || flags._.join(' ');

      const pid = flags.pid
        ? Number(flags.pid)
        : await getKibanaProcessId({
            ports: uniq(compact([Number(flags.port), 5603, 5601])),
          });

      process.kill(pid, 'SIGUSR1');

      const stop = once(await getProfiler({ log }));

      const controller = new AbortController();
      if (flags.timeout) {
        setTimeout(() => {
          controller.abort();
        }, Number(flags.timeout));
      }

      addCleanupTask(() => {
        // exit-hook, which is used by addCleanupTask,
        // only allows for synchronous exits, and 3.x
        // are on ESM which we currently can't use. so
        // we do a really gross thing where we make
        // process.exit a noop for a bit until the
        // profile has been collected and opened
        const exit = process.exit.bind(process);

        // @ts-expect-error
        process.exit = () => {};
        process.nextTick(() => {
          process.exit = exit;
        });

        stop()
          .then(() => {
            exit(0);
          })
          .catch((error) => {
            log.error(error);
            exit(1);
          });
      });

      if (command) {
        const connections = Number(flags.c || flags.connections || 1);
        const amount = Number(flags.a || flags.amount || 1);

        log.info(`Executing "${command}" ${amount} times, ${connections} at a time`);

        await runCommand({
          command,
          connections,
          amount,
          signal: controller.signal,
        });

        await stop();
      } else {
        if (flags.timeout) {
          log.info(`Awaiting timeout of ${flags.timeout}ms`);
        } else {
          log.info(`Awaiting SIGINT (Cmd+C)...`);
        }

        await runUntilSigInt({
          log,
          signal: controller.signal,
        });
      }
    },
    {
      flags: {
        string: ['port', 'pid', 't', 'timeout', 'c', 'connections', 'a', 'amount'],
        help: `
          Usage: node scripts/profiler.js <args> <command>

          --port              Port on which Kibana is running. Falls back to 5603 & 5601.
          --pid               Process ID to hook into it. Takes precedence over \`port\`.
          --timeout           Run commands until timeout (in milliseconds)
          --c, --connections  Number of commands that can be run in parallel.
          --a, --amount       Amount of times the command should be run
        `,
        allowUnexpected: true,
      },
    }
  );
}
