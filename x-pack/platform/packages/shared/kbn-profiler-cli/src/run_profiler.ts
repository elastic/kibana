/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { compact, once, uniq } from 'lodash';
import type { Observable } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import type { ToolingLog } from '@kbn/tooling-log';
import { getProcessId } from './get_process_id';
import { runCommand } from './run_command';
import { runUntilSigInt } from './run_until_sigint';
import { getProfiler } from './get_profiler';
import { untilStdinCompletes } from './until_stdin_completes';
import { runInspectableProcess } from './run_inspectable_process';
import type { ProfilerCliFlags } from './flags';
import { DEFAULT_INSPECTOR_PORT, NO_GREP } from './flags';

export async function runProfiler({
  flags,
  log,
  addCleanupTask,
}: {
  flags: ProfilerCliFlags;
  log: ToolingLog;
  addCleanupTask: (cb: () => void) => void;
}) {
  const controller = new AbortController();
  if (flags.timeout) {
    setTimeout(() => {
      controller.abort();
    }, Number(flags.timeout));
  }

  // flags.grep can only be a string, and defaults to an empty string,
  // so we override the default with a const and check for that
  // to differentiate between ``, `--grep` and `--grep myString`
  const grep = flags.grep === NO_GREP ? false : flags.grep === '' ? true : String(flags.grep || '');

  const spawn = flags.spawn ?? false;

  async function getPid() {
    const pid = await getProcessId({
      ports: uniq(compact([Number(flags.port), 5603, 5601])),
      grep,
    });

    if (pid) {
      return pid;
    }
  }

  let pid = flags.pid ? Number(flags.pid) : await getPid();

  let spawnedClose$: Observable<void> | null = null;

  const inspectorPort = flags['inspector-port']
    ? Number(flags['inspector-port'])
    : DEFAULT_INSPECTOR_PORT;

  if (spawn) {
    const [file, ...args] = flags._;

    const spawned = await runInspectableProcess({
      file,
      args,
      inspectorPort,
      log,
      signal: controller.signal,
    });

    pid = spawned.pid;
    spawnedClose$ = spawned.close$;
  }

  if (!pid) {
    throw new Error(`Could not find running process to attach to`);
  }

  if (!spawn) {
    log.debug(`Sending SIGUSR1 to ${pid}`);
    process.kill(pid, 'SIGUSR1');
  }

  const stop = once(
    await getProfiler({
      pid,
      log,
      type: flags.heap ? 'heap' : 'cpu',
      inspectorPort,
    })
  );

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
  } else if (!spawn && flags._.length) {
    const connections = Number(flags.c || flags.connections || 1);
    const amount = Number(flags.a || flags.amount || 1);
    const command = flags._;

    log.info(`Executing "${command.join(' ')}" ${amount} times, ${connections} at a time`);

    await runCommand({
      command,
      connections,
      amount,
      signal: controller.signal,
    });
  } else if (spawnedClose$) {
    log.info(`Awaiting completion of spawned process`);

    await lastValueFrom(spawnedClose$);
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
}
