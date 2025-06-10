/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import execa from 'execa';
import inquirer from 'inquirer';
import { getNodeProcesses } from './get_node_processes';

class ProcessNotFoundError extends Error {
  constructor() {
    super(`No Node.js processes found to attach to`);
  }
}

async function getProcessIdAtPort(port: number) {
  return await execa
    .command(`lsof -ti :${port}`)
    .then(({ stdout }) => {
      return parseInt(stdout.trim().split('\n')[0], 10);
    })
    .catch((error) => {
      return undefined;
    });
}

export async function getProcessId({
  ports,
  grep,
}: {
  ports: number[];
  grep: boolean | string;
}): Promise<number> {
  if (grep) {
    const candidates = await getNodeProcesses(typeof grep === 'boolean' ? '' : grep);

    if (!candidates.length) {
      throw new ProcessNotFoundError();
    }

    const { pid } = await inquirer.prompt({
      type: 'list',
      name: 'pid',
      message: `Select a Node.js process to attach to`,
      choices: candidates.map((candidate) => {
        return {
          name: `${candidate.command}${
            candidate.ports.length ? ` (Listening on ${candidate.ports.join(', ')})` : ``
          }`,
          value: candidate.pid,
        };
      }),
    });

    return pid as number;
  }

  for (const port of ports) {
    const pid = await getProcessIdAtPort(port);
    if (pid) {
      return pid;
    }
  }

  throw new Error(`Kibana process id not found at ports ${ports.join(', ')}`);
}
