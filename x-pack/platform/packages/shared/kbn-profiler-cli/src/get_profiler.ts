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
import type { ToolingLog } from '@kbn/tooling-log';
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
  inspectorPort,
}: {
  log: ToolingLog;
  type: 'cpu' | 'heap';
  pid: number;
  inspectorPort: number;
}): Promise<() => Promise<void>> {
  const port = await getPort({
    host: '127.0.0.1',
    port: inspectorPort,
    exclusive: true,
  });

  log.debug({
    port,
    inspectorPort,
  });

  // Discover processes that are currently listening on the inspector port so we can highlight
  // potential conflicts when attaching the profiler.
  const inspectorListenerPids: string[] = (() => {
    try {
      const { stdout } = execa.commandSync(`lsof -nP -iTCP:${inspectorPort} -sTCP:LISTEN -t`);

      return stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line): line is string => line.length > 0);
    } catch (error) {
      if (error instanceof Error) {
        const potentialStdout = (error as { stdout?: unknown }).stdout;

        if (typeof potentialStdout === 'string') {
          return potentialStdout
            .split('\n')
            .map((line) => line.trim())
            .filter((line): line is string => line.length > 0);
        }
      }

      throw error;
    }
  })();

  if (inspectorListenerPids.length === 0) {
    log.debug(`No inspector listeners found on port ${inspectorPort}`);
  } else {
    const pidList = inspectorListenerPids.join(',');
    const { stdout: inspectorListenerDetails } = execa.commandSync(
      `ps -p ${pidList} -o pid,ppid,user,command`
    );

    log.debug(`Inspector listeners on port ${inspectorPort}:\n${inspectorListenerDetails}`);
  }

  if (port !== inspectorPort) {
    // Inspector is already running, see if it's attached to the selected process
    await getNodeProcesses()
      .then((processes) => processes.find((process) => process.pid === pid))
      .then((candidate) => {
        if (!candidate?.ports.includes(inspectorPort)) {
          throw new InspectorSessionConflictError();
        }
      });
  }

  const client = await CDP({ port: inspectorPort });

  log.info(`Attached to remote debugger at ${inspectorPort}`);

  const stop =
    type === 'cpu' ? await getCpuProfiler({ client, log }) : await getHeapProfiler({ client, log });

  log.debug(`Started profiling session`);

  await client.Runtime.runIfWaitingForDebugger();

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
