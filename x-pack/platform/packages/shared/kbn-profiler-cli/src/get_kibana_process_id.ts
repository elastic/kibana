/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import execa from 'execa';

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

export async function getKibanaProcessId({ ports }: { ports: number[] }): Promise<number> {
  for (const port of ports) {
    const pid = await getProcessIdAtPort(port);
    if (pid) {
      return pid;
    }
  }

  throw new Error(`Kibana process id not found at ports ${ports.join(', ')}`);
}
