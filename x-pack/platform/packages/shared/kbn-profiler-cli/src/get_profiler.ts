/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import CDP from 'chrome-remote-interface';
import { promises as Fs } from 'fs';
import Os from 'os';
import Path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import execa from 'execa';

export async function getProfiler({ log }: { log: ToolingLog }): Promise<() => Promise<void>> {
  log.debug(`Attaching to remote debugger at 9229`);
  const client = await CDP({ port: 9229 });

  log.info(`Attached to remote debugger at 9229`);

  await client.Profiler.enable();
  await client.Profiler.start();

  log.info(`Started profiling session`);

  return async () => {
    log.debug(`Stopping profiling session`);

    const { profile } = await client.Profiler.stop();

    await client.Profiler.disable();

    await client.close();

    log.debug(`Closed connection to remote debugger`);

    // Write the profile data to a file.
    const tmpDir = await Fs.mkdtemp(Path.join(Os.tmpdir(), 'kbn-profiles'));

    const profileFilePath = Path.join(tmpDir, 'profile.cpuprofile');

    await Fs.writeFile(profileFilePath, JSON.stringify(profile), 'utf-8');

    log.info(`Wrote profile to ${profileFilePath}`);

    await execa.command(`npx speedscope ${profileFilePath}`);
  };
}
