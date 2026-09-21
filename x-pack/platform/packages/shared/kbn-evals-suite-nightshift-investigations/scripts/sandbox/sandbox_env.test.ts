/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { DEFAULT_SANDBOX_PORTS, readSandboxPorts, renderSandboxEnv } from './sandbox_env';

describe('readSandboxPorts', () => {
  it('uses the sandbox-service defaults and applies overrides', () => {
    expect(readSandboxPorts({})).toEqual(DEFAULT_SANDBOX_PORTS);
    expect(readSandboxPorts({ 'grpc-port': '9092', 'manager-port': 50053 })).toEqual({
      grpc: 9092,
      probe: DEFAULT_SANDBOX_PORTS.probe,
      manager: 50053,
    });
  });

  it.each(['0', '65536', '9090.5', 'grpc', ''])('rejects %p as a port', (value) => {
    expect(() => readSandboxPorts({ 'probe-port': value })).toThrow('Invalid --probe-port value');
  });

  it('rejects ports that collide', () => {
    expect(() => readSandboxPorts({ 'probe-port': String(DEFAULT_SANDBOX_PORTS.grpc) })).toThrow(
      'must all differ'
    );
  });
});

describe('renderSandboxEnv', () => {
  it('survives being sourced by a shell, even with awkward paths', () => {
    const directory = mkdtempSync(join(tmpdir(), 'nightshift-sandbox-env-'));
    const connection = {
      apiKey: 'synthetic-key',
      grpcPort: 9092,
      clientCertificatePath: "/tmp/it's here/client $(id).crt",
      clientKeyPath: '/tmp/ssl/client.key',
      caCertificatePath: '/tmp/ssl/server.crt',
    };
    try {
      const file = join(directory, 'sandbox.env');
      writeFileSync(file, renderSandboxEnv(connection));
      const names = [
        'SANDBOX_API_KEY',
        'SANDBOX_API_HOST',
        'SANDBOX_API_PORT',
        'SANDBOX_CLIENT_CERT_PATH',
        'SANDBOX_CLIENT_KEY_PATH',
        'SANDBOX_CA_CERT_PATH',
      ];
      const printed = execFileSync(
        'bash',
        [
          '-c',
          `source "$1"; printf '%s\\n' ${names.map((name) => `"$${name}"`).join(' ')}`,
          '-',
          file,
        ],
        { encoding: 'utf8', env: { PATH: process.env.PATH } }
      );
      expect(printed.trimEnd().split('\n')).toEqual([
        connection.apiKey,
        'localhost',
        '9092',
        connection.clientCertificatePath,
        connection.clientKeyPath,
        connection.caCertificatePath,
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
