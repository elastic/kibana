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
import getPort from 'get-port';
import { getNodeProcesses } from './get_node_processes';

class InspectorSessionConflictError extends Error {
  constructor() {
    super(`An inspector session is already running in another process. Close the process first.`);
  }
}

async function getHeapProfiler({ client, log }: { client: CDP.Client; log: ToolingLog }) {
  await client.HeapProfiler.enable();

  log.debug(`Enabled heap profiler`);

  await client.HeapProfiler.startSampling();

  return async () => {
    log.debug(`Taking heap snapshot`);

    const { profile } = await client.HeapProfiler.stopSampling();

    await client.HeapProfiler.disable();

    return {
      name: 'heap.heapsnapshot',
      content: JSON.stringify(profile),
    };
  };
}

async function getCpuProfiler({ client, log }: { client: CDP.Client; log: ToolingLog }) {
  log.debug('Enabled profiler');
  await client.Profiler.enable();
  await client.Profiler.start();

  return async () => {
    const { profile } = await client.Profiler.stop();

    await client.Profiler.disable();

    return {
      name: 'profile.cpuprofile',
      content: JSON.stringify(profile),
    };
  };
}

export async function getProfiler({
  log,
  type,
  pid,
}: {
  log: ToolingLog;
  type: 'cpu' | 'heap';
  pid: number;
}): Promise<() => Promise<void>> {
  const port = await getPort({
    host: '127.0.0.1',
    port: 9229,
  });

  if (port !== 9229) {
    // Inspector is already running, see if it's attached to the selected process
    await getNodeProcesses()
      .then((processes) => processes.find((process) => process.pid === pid))
      .then((candidate) => {
        if (!candidate?.ports.includes(9229)) {
          throw new InspectorSessionConflictError();
        }
      });
  }

  const client = await CDP({ port: 9229 });

  log.info(`Attached to remote debugger at 9229`);

  const stop =
    type === 'cpu' ? await getCpuProfiler({ client, log }) : await getHeapProfiler({ client, log });

  log.debug(`Started profiling session`);

  return async () => {
    log.debug(`Stopping profiling session`);

    const { name, content } = await stop();

    await client.close();

    log.debug(`Closed connection to remote debugger`);

    // Write the profile data to a file.
    const tmpDir = await Fs.mkdtemp(Path.join(Os.tmpdir(), 'kbn-profiles'));

    const profileFilePath = Path.join(tmpDir, name);

    await Fs.writeFile(profileFilePath, content, 'utf-8');

    log.info(`Wrote profile to ${profileFilePath}`);

    await execa.command(`npx speedscope ${profileFilePath}`);

    log.info(`Opened Speedscope`);
  };
}
