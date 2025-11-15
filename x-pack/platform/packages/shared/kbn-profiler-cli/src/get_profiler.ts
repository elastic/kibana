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
  outputTimestamp,
}: {
  log: ToolingLog;
  type: 'cpu' | 'heap';
  pid: number;
  inspectorPort: number;
  outputTimestamp?: string;
}): Promise<() => Promise<void>> {
  const port = await getPort({
    host: '127.0.0.1',
    port: inspectorPort,
  });

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

    // Write the profile data to a file in the same directory as kbn-profiler
    const profileDir = Path.join(Os.tmpdir(), 'kbn-profiler-cli-profiles');
    await Fs.mkdir(profileDir, { recursive: true });

    // Use provided timestamp or generate one
    const timestamp =
      outputTimestamp || new Date().toISOString().replace(/[:.]/g, '-').slice(0, 15);

    // Determine profile type suffix
    const typeSuffix = outputTimestamp ? '-backend' : '';

    // Generate filename: profile-{timestamp}-backend.cpuprofile or profile-{timestamp}.cpuprofile (legacy)
    let profileFileName: string;
    if (outputTimestamp) {
      const extension = name.match(/\.(cpuprofile|heapsnapshot)$/)?.[1] || 'cpuprofile';
      profileFileName = `profile-${timestamp}${typeSuffix}.${extension}`;
    } else {
      profileFileName = name.replace(/\.(cpuprofile|heapsnapshot)$/, `-${timestamp}.$1`);
    }

    const profileFilePath = Path.join(profileDir, profileFileName);

    await Fs.writeFile(profileFilePath, content, 'utf-8');

    log.info(`Wrote profile to ${profileFilePath}`);

    // Skip Speedscope if requested (useful for IDE integrations)
    if (!process.env.SKIP_SPEEDSCOPE) {
      await execa.command(`npx speedscope ${profileFilePath}`);
      log.info(`Opened Speedscope`);
    } else {
      log.info(`Skipped opening Speedscope (SKIP_SPEEDSCOPE=1)`);
    }
  };
}
