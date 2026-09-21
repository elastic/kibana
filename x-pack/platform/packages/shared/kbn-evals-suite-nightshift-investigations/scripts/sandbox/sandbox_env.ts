/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface SandboxPorts {
  /** gRPC port Kibana connects to. */
  grpc: number;
  /** HTTP port serving only the `/live` and `/ready` probes. */
  probe: number;
  /** container-manager gRPC port, dialled by sandbox-api only. */
  manager: number;
}

export const DEFAULT_SANDBOX_PORTS: SandboxPorts = { grpc: 9090, probe: 8090, manager: 50051 };

const PORT_FLAGS = {
  grpc: 'grpc-port',
  probe: 'probe-port',
  manager: 'manager-port',
} as const satisfies Record<keyof SandboxPorts, string>;

/** Reads the port flags, rejecting values that are not ports or that collide with each other. */
export const readSandboxPorts = (
  flags: Record<string, unknown>,
  defaults: SandboxPorts = DEFAULT_SANDBOX_PORTS
): SandboxPorts => {
  const ports = { ...defaults };
  for (const [name, flag] of Object.entries(PORT_FLAGS) as Array<[keyof SandboxPorts, string]>) {
    const value = flags[flag];
    if (value === undefined) continue;
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid --${flag} value. Must be a whole number between 1 and 65535.`);
    }
    ports[name] = port;
  }
  if (new Set(Object.values(ports)).size !== Object.keys(ports).length) {
    throw new Error('The gRPC, probe and manager ports must all differ.');
  }
  return ports;
};

export interface SandboxConnection {
  apiKey: string;
  grpcPort: number;
  clientCertificatePath: string;
  clientKeyPath: string;
  caCertificatePath: string;
}

const shellQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

/** Renders the variables the `evals_nightshift_investigations` Scout config reads, for `source`. */
export const renderSandboxEnv = ({
  apiKey,
  grpcPort,
  clientCertificatePath,
  clientKeyPath,
  caCertificatePath,
}: SandboxConnection): string =>
  [
    '# Written by scripts/nightshift_sandbox.js. Holds a credential: do not commit or share it.',
    `export SANDBOX_API_KEY=${shellQuote(apiKey)}`,
    `export SANDBOX_API_HOST='localhost'`,
    `export SANDBOX_API_PORT=${shellQuote(String(grpcPort))}`,
    `export SANDBOX_CLIENT_CERT_PATH=${shellQuote(clientCertificatePath)}`,
    `export SANDBOX_CLIENT_KEY_PATH=${shellQuote(clientKeyPath)}`,
    `export SANDBOX_CA_CERT_PATH=${shellQuote(caCertificatePath)}`,
    '',
  ].join('\n');
