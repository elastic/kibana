/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Net from 'net';
import { execFileSync } from 'child_process';

/** Host ports kbn-es always maps for the serverless ES nodes' transport (es01-es03). */
export const SERVERLESS_TRANSPORT_PORTS = [9300, 9301, 9302] as const;

const isPortInUse = (port: number): Promise<boolean> =>
  new Promise((resolve) => {
    const server = Net.createServer();
    server.once('error', (error: NodeJS.ErrnoException) => resolve(error.code === 'EADDRINUSE'));
    server.once('listening', () => server.close(() => resolve(false)));
    server.listen(port, '127.0.0.1');
  });

export const findPortsInUse = async (ports: readonly number[]): Promise<number[]> => {
  const inUse = await Promise.all(ports.map(isPortInUse));
  return ports.filter((_, index) => inUse[index]);
};

// kbn-es kills its own running es01-es03 containers before starting, so their ports are not a conflict.
const hasServerlessEsContainers = (): boolean => {
  try {
    return (
      execFileSync('docker', ['ps', '-q', '--filter', 'name=^/es0[1-3]$'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 5_000,
      }).trim().length > 0
    );
  } catch {
    return false;
  }
};

/**
 * Fails before Scout starts when another process holds the serverless ES transport ports, which
 * otherwise surfaces as a long `docker run` error once Scout is already booting.
 */
export const assertServerlessPortsFree = async (): Promise<void> => {
  const inUse = await findPortsInUse(SERVERLESS_TRANSPORT_PORTS);
  if (inUse.length === 0 || hasServerlessEsContainers()) {
    return;
  }
  throw new Error(
    `Serverless Elasticsearch needs ports ${SERVERLESS_TRANSPORT_PORTS.join(
      ', '
    )}, but ${inUse.join(', ')} ${
      inUse.length === 1 ? 'is' : 'are'
    } in use. Find the process with ` +
      `\`lsof -nP -iTCP:${inUse[0]} -sTCP:LISTEN\`. A development Elasticsearch ` +
      `(\`yarn es snapshot\`) uses 9300; stop it or restart it with \`-E transport.port=9400\`.`
  );
};
