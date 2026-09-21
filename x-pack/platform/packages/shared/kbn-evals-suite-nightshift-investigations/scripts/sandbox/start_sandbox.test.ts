/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventEmitter } from 'events';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { startSandbox, type StartSandboxOptions } from './start_sandbox';

interface Call {
  command: string;
  args: string[];
  options: { cwd?: string; env?: Record<string, string> };
}

interface FakeService extends Promise<unknown> {
  kill: jest.Mock;
  exitCode: number | null;
  stdout: EventEmitter;
  stderr: EventEmitter;
  fail: (error: Error) => void;
}

const calls: Call[] = [];
const syncCalls: Call[] = [];
const services = new Map<string, FakeService>();
const listeningPorts = new Set<number>();

jest.mock('net', () => ({
  connect: ({ port }: { port: number }) => {
    const socket = Object.assign(new EventEmitter(), { destroy: () => socket });
    setImmediate(() => socket.emit(listeningPorts.has(port) ? 'connect' : 'error', new Error()));
    return socket;
  },
}));

jest.mock('execa', () => {
  const execa = (command: string, args: string[], options: Call['options'] = {}) => {
    calls.push({ command, args, options });
    const name = command.split('/').pop() ?? command;
    if (name === 'container-manager-service' || name === 'sandbox-api') {
      let fail: (error: Error) => void = () => undefined;
      const running = new Promise((_, reject) => (fail = reject));
      running.catch(() => undefined);
      const service = Object.assign(running, {
        kill: jest.fn(),
        exitCode: null,
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        fail,
      }) as FakeService;
      services.set(name, service);
      const port = options.env?.CONTAINERMANAGER_LISTEN_PORT;
      if (port) listeningPorts.add(Number(port));
      return service;
    }
    if (command === 'openssl' && options.cwd) {
      for (const file of args.filter((arg) => /\.(key|crt|csr)$/.test(arg))) {
        writeFileSync(join(options.cwd, file), 'synthetic');
      }
    }
    const missing =
      (command === 'docker' && args[1] === 'inspect') ||
      (command === 'which' && args[0] === 'missing-tool');
    return Promise.resolve({ failed: missing, stdout: 'abc1234' });
  };
  execa.sync = (command: string, args: string[], options: Call['options'] = {}) => {
    syncCalls.push({ command, args, options });
    return { stdout: args[0] === 'ps' ? 'container-a\ncontainer-b' : '' };
  };
  return { __esModule: true, default: execa };
});

describe('startSandbox', () => {
  const ports = { grpc: 19092, probe: 18092, manager: 15053 };
  let dataDir: string;
  let cleanupTasks: Array<() => void>;
  let controller: AbortController;

  const start = (overrides: Partial<StartSandboxOptions> = {}) =>
    startSandbox({
      log: new ToolingLog(),
      signal: controller.signal,
      dataDir,
      ports,
      ref: 'main',
      rebuild: false,
      addCleanupTask: (task) => cleanupTasks.push(task),
      ...overrides,
    });

  const untilReady = async () => {
    while (!services.has('sandbox-api')) await new Promise((resolve) => setImmediate(resolve));
    while (cleanupTasks.length === 0) await new Promise((resolve) => setImmediate(resolve));
  };

  beforeEach(() => {
    calls.length = 0;
    syncCalls.length = 0;
    services.clear();
    listeningPorts.clear();
    cleanupTasks = [];
    controller = new AbortController();
    dataDir = mkdtempSync(join(tmpdir(), 'nightshift-sandbox-test-'));
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => rmSync(dataDir, { recursive: true, force: true }));

  it('provisions a launcher-scoped sandbox without exposing the key, then stops on abort', async () => {
    const running = start();
    await untilReady();
    const envFile = join(dataDir, 'sandbox.env');
    while (!statSync(envFile, { throwIfNoEntry: false })) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    const apiKey = readFileSync(join(dataDir, 'api_key'), 'utf8');
    const network = `kibana-nightshift-sandbox-${ports.grpc}`;
    expect(calls.find(({ args }) => args[0] === 'clone')?.options.env).toMatchObject({
      GIT_TERMINAL_PROMPT: '0',
    });
    expect(calls.some(({ args }) => args.join(' ') === `network create ${network}`)).toBe(true);
    const manager = calls.find(({ command }) => command.endsWith('container-manager-service'));
    expect(manager?.options).toMatchObject({
      cwd: dataDir,
      env: { CONTAINERMANAGER_DOCKER_SANDBOX_NETWORK: network, CLUSTER_NAME: 'localhost' },
    });
    const api = calls.find(({ command }) => command.endsWith('sandbox-api'));
    expect(api?.options.env).toMatchObject({
      SANDBOX_API_KEY: apiKey,
      SANDBOX_GRPC_ADDRESS: `:${ports.grpc}`,
      SANDBOX_API_CLIENT_CA_CERT: join(dataDir, 'ssl/server.crt'),
    });
    expect(JSON.stringify(calls.map(({ command, args }) => [command, args]))).not.toContain(apiKey);

    expect(readFileSync(envFile, 'utf8')).toContain(`SANDBOX_API_KEY='${apiKey}'`);
    for (const [path, mode] of [
      [envFile, '600'],
      [join(dataDir, 'api_key'), '600'],
      [join(dataDir, 'ssl/client.key'), '600'],
      [dataDir, '700'],
    ]) {
      expect(statSync(path).mode.toString(8).slice(-3)).toBe(mode);
    }

    controller.abort();
    for (const service of services.values()) service.fail(new Error('killed'));
    await expect(running).resolves.toBeUndefined();
    for (const service of services.values()) expect(service.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('removes only its own network and containers when the CLI exits', async () => {
    const running = start();
    await untilReady();
    cleanupTasks.forEach((task) => task());

    const network = `kibana-nightshift-sandbox-${ports.grpc}`;
    expect(syncCalls.map(({ args }) => args.join(' '))).toEqual([
      `ps --all --quiet --filter network=${network}`,
      'rm --force container-a container-b',
      `network rm ${network}`,
    ]);

    controller.abort();
    for (const service of services.values()) service.fail(new Error('killed'));
    await running;
  });

  it('leaves a running launcher alone when its ports are already taken', async () => {
    listeningPorts.add(ports.grpc);

    await expect(start()).rejects.toThrow(`port ${ports.grpc} is already in use`);
    expect(cleanupTasks).toEqual([]);
    expect(calls.filter(({ command }) => command !== 'which')).toEqual([]);
  });

  it.each(['container-manager-service', 'sandbox-api'])(
    'stops the other service and fails when %s exits on its own',
    async (crashed) => {
      const running = start();
      await untilReady();
      services.get(crashed)?.fail(new Error('crashed'));

      await expect(running).rejects.toThrow('stopped unexpectedly');
      for (const service of services.values()) expect(service.kill).toHaveBeenCalledWith('SIGTERM');
    }
  );

  it('builds an existing checkout as-is without needing git', async () => {
    const repoDir = join(dataDir, 'checkout');
    mkdirSync(join(repoDir, 'cmd/sandbox-api'), { recursive: true });
    const running = start({ repoDir });
    await untilReady();

    expect(calls.some(({ command }) => command === 'git')).toBe(false);
    expect(
      calls.filter(({ command }) => command === 'go').map(({ options }) => options.cwd)
    ).toEqual([repoDir, repoDir]);

    controller.abort();
    for (const service of services.values()) service.fail(new Error('killed'));
    await running;
  });
});
