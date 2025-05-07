/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { run } from '@kbn/dev-cli-runner';
import { compact, once, uniq } from 'lodash';
import { getProcessId } from './src/get_process_id';
import { runCommand } from './src/run_command';
import { runUntilSigInt } from './src/run_until_sigint';
import { getProfiler } from './src/get_profiler';
import { untilStdinCompletes } from './src/until_stdin_completes';

const NO_GREP = '__NO_GREP__';

export function cli() {
  run(
    async ({ flags, log, addCleanupTask }) => {
      // flags.grep can only be a string, and defaults to an empty string,
      // so we override the default with a const and check for that
      // to differentiate between ``, `--grep` and `--grep myString`
      const grep = flags.grep === NO_GREP ? false : flags.grep === '' ? true : String(flags.grep);

      const pid = flags.pid
        ? Number(flags.pid)
        : await getProcessId({
            ports: uniq(compact([Number(flags.port), 5603, 5601])),
            grep,
          });

      const controller = new AbortController();
      if (flags.timeout) {
        setTimeout(() => {
          controller.abort();
        }, Number(flags.timeout));
      }

      log.debug(`Sending SIGUSR1 to ${pid}`);

      process.kill(pid, 'SIGUSR1');

      const stop = once(await getProfiler({ pid, log, type: flags.heap ? 'heap' : 'cpu' }));

      addCleanupTask(() => {
        // exit-hook, which is used by addCleanupTask,
        // only allows for synchronous exits, and 3.x
        // are on ESM which we currently can't use. so
        // we do a really gross thing where we make
        // process.exit a noop for a bit until the
        // profile has been collected and opened
        const exit = process.exit.bind(process);
        const kill = process.kill.bind(process);

        // @ts-expect-error
        process.exit = () => {};
        process.kill = (pidToKill, signal) => {
          // inquirer sends a SIGINT kill signal to the process,
          // that we need to handle here
          if (pidToKill === process.pid && signal === 'SIGINT') {
            return true;
          }
          return kill(pidToKill, signal);
        };

        stop()
          .then(() => {
            exit(0);
          })
          .catch((error) => {
            log.error(error);
            exit(1);
          });
      });

      if (!process.stdin.isTTY) {
        await untilStdinCompletes();
      } else if (flags._.length) {
        const connections = Number(flags.c || flags.connections || 1);
        const amount = Number(flags.a || flags.amount || 1);
        const command = flags._;

        log.info(`Executing "${command}" ${amount} times, ${connections} at a time`);

        await runCommand({
          command,
          connections,
          amount,
          signal: controller.signal,
        });
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

      await stop();
    },
    {
      flags: {
        string: ['port', 'pid', 't', 'timeout', 'c', 'connections', 'a', 'amount', 'grep'],
        boolean: ['heap'],
        help: `
          Usage: node scripts/profiler.js <args> <command>

          --port              Port on which Kibana is running. Falls back to 5603 & 5601.
          --pid               Process ID to hook into it. Takes precedence over \`port\`.
          --timeout           Run commands until timeout (in milliseconds)
          --c, --connections  Number of commands that can be run in parallel.
          --a, --amount       Amount of times the command should be run
          --heap              Collect a heap snapshot
          --grep              Grep through running Node.js processes
        `,
        default: {
          grep: NO_GREP,
        },
        allowUnexpected: false,
      },
    }
  );
}
