/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { run } from '@kbn/dev-cli-runner';
import Path from 'path';
import { promises as Fs } from 'fs';
import Os from 'os';
import execa from 'execa';
import pLimit from 'p-limit';
import { range } from 'lodash';
import { getKibanaProcessId } from './src/get_kibana_process_id';
import { getInspectorSession } from './src/get_inspector_session';

run(
  async ({ flags, log, addCleanupTask }) => {
    const command = flags._.join(' ');
    const pid = flags.pid
      ? Number(flags.pid)
      : await getKibanaProcessId({
          port: Number(flags.port || 5603),
        });

    process.kill(pid, 'SIGUSR1');

    const stop = await getInspectorSession();

    addCleanupTask(() => {
      return stop();
    });

    const connections = Number(flags.c || flags.connections || 1);
    const amount = Number(flags.a || flags.amount || 1);

    log.info(`Executing "${command}" ${amount} times, ${connections} at a time`);

    if (amount === 1) {
      await execa.command(command).catch((error) => {
        log.error(new AggregateError([error], `Command "${command}" failed`));
      });
    } else {
      const limiter = pLimit(connections);

      await Promise.allSettled(
        range(0, amount).map(async () => {
          await limiter(() => execa.command(command, { stdio: 'ignore' }));
        })
      ).then((results) => {
        const errors = results.flatMap((result) =>
          result.status === 'rejected' ? [result.reason] : []
        );
        if (errors.length) {
          log.error(new AggregateError(errors, `Some executions failed`));
        }
      });
    }

    const profile = await stop();

    // Write the profile data to a file.
    const tmpDir = await Fs.mkdtemp(Path.join(Os.tmpdir(), 'kbn-profiles'));

    const profileFilePath = Path.join(tmpDir, 'profile.cpuprofile');

    await Fs.writeFile(profileFilePath, JSON.stringify(profile), 'utf-8');

    log.info(`Wrote profile to ${profileFilePath}`);

    await execa.command(`npx speedscope ${profileFilePath}`);
  },
  {
    flags: {
      string: ['port', 'pid', 'timeout', 'c', 'connections', 'a', 'amount'],
      allowUnexpected: true,
    },
  }
);
