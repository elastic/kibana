/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import execa from 'execa';

export async function getNodeProcesses(
  grep?: string
): Promise<Array<{ pid: number; command: string; ports: number[] }>> {
  const candidates = await execa
    .command(
      `ps -eo pid,command | grep -E '^[[:space:]]*[0-9]+[[:space:]]+([^[:space:]]+/)*node($|[[:space:]])' | grep -v grep ${
        grep ? `| grep "${grep}" ` : ''
      }`,
      { shell: true, reject: false }
    )
    .then(({ stdout, exitCode }) => {
      if (exitCode !== 0) {
        return [];
      }

      // example
      // 6915 /Users/dariogieselaar/.nvm/versions/node/v20.18.2/bin/node scripts/es snapshot
      const lines = stdout.split('\n');
      return lines.map((line) => {
        const [pid, ...command] = line.trim().split(' ');
        return {
          pid: Number(pid.trim()),
          command: command.join(' ').trim(),
        };
      });
    });

  if (!candidates.length) {
    return [];
  }

  const pids = candidates.map((candidate) => candidate.pid);
  const portsByPid: Record<string, number[]> = {};

  await execa
    .command(`lsof -Pan -i -iTCP -sTCP:LISTEN -p ${pids.join(',')}`, { shell: true, reject: false })
    .then(({ stdout, exitCode }) => {
      // exitCode 1 is returned when some of the ports don't match
      if (exitCode !== 0 && exitCode !== 1) {
        return;
      }

      const lines = stdout.split('\n').slice(1);

      lines.forEach((line) => {
        const values = line.trim().split(/\s+/);
        const pid = values[1];
        const name = values.slice(8).join(' ');

        if (!name) {
          return;
        }

        const portMatch = name.match(/:(\d+)(?:\s|\()/);
        const port = portMatch ? Number(portMatch[1]) : undefined;
        if (port) {
          (portsByPid[pid] = portsByPid[pid] || []).push(port);
        }
      });
    });

  return candidates.map(({ pid, command }) => {
    return {
      pid,
      command,
      ports: portsByPid[pid] ?? [],
    };
  });
}
