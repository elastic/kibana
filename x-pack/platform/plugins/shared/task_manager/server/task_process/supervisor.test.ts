/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TASK_PROCESS_PROTOCOL_VERSION, TASK_PROCESS_CAPABILITIES } from './protocol';
import { EventEmitter } from 'events';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { TaskProcessLease } from './remote_task_runner';
import type { TaskProcessDispatchSnapshot } from './wire';
import type { TaskFeatureFlagDefinitions } from './feature_flag_declarations';
import { TaskProcessSupervisor } from './supervisor';
import type { TaskProcessSettings } from './supervisor';

const createBundleDir = (featureFlags?: TaskFeatureFlagDefinitions) => {
  const dir = mkdtempSync(join(tmpdir(), 'task-bundles-'));
  writeFileSync(join(dir, 'a.js'), '');
  writeFileSync(join(dir, 'b.js'), '');
  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify({
      bundles: {
        a: { file: 'a.js', taskType: 'alerting_v2:cleanup', featureFlags },
        b: { file: 'b.js', taskType: 'task_manager:nodes' },
      },
    })
  );
  return dir;
};

class FakeChild extends EventEmitter {
  public send = jest.fn();
  public pid = 4242;
  public exitCode: number | null = null;
  public signalCode: string | null = null;
  public kill = jest.fn((signal?: string) => {
    this.exitCode = 0;
    this.emit('exit', 0, signal);
    return true;
  });
}

describe('TaskProcessSupervisor', () => {
  const setup = (overrides: Partial<TaskProcessSettings> = {}) => {
    const children: Array<{
      file: string;
      env: NodeJS.ProcessEnv;
      execArgv: string[];
      child: FakeChild;
    }> = [];
    const forkFn = jest.fn(
      (file: string, _args: unknown, options: { env: NodeJS.ProcessEnv; execArgv: string[] }) => {
        const child = new FakeChild();
        children.push({ file, env: options.env, execArgv: options.execArgv, child });
        return child;
      }
    );
    const supervisor = new TaskProcessSupervisor({
      settings: {
        bundle_dir: createBundleDir(),
        kibanaVersion: '9.9.9',
        ...overrides,
        getElasticsearchConfig: () => ({ hosts: ['http://es:9200'] } as never),
        getInitFor:
          overrides.getInitFor ??
          ((taskType) =>
            taskType === 'alerting_v2:cleanup'
              ? {
                  server: { uuid: 'uuid', buildNum: 1, isServerless: false },
                  encryptedSavedObjects: { encryptionKey: 'k'.repeat(32), decryptionOnlyKeys: [] },
                }
              : {}),
      },
      logger: loggingSystemMock.createLogger(),
      forkFn: forkFn as never,
    });
    const acquire = (type: string) =>
      (supervisor.getRoute(type) as { acquire: () => Promise<TaskProcessLease> }).acquire();
    const ready = (index: number, port = 4567, featureFlags?: TaskFeatureFlagDefinitions) =>
      children[index].child.emit('message', {
        kind: 'ready',
        port,
        protocolVersion: TASK_PROCESS_PROTOCOL_VERSION,
        capabilities: TASK_PROCESS_CAPABILITIES,
        featureFlags,
      });
    return { supervisor, children, forkFn, acquire, ready };
  };

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.NODE_OPTIONS;
  });

  const reuse = { idleTimeoutMs: 1000, maxAgeMs: 5000, maxRuns: 3, maxIdleProcesses: 2 };

  it('serves shipped SDK flag defaults and validates them against the actual worker', async () => {
    const declarations = { 'sdk.enabled': false, 'sdk.mode': 'true' };
    const { supervisor, acquire, ready } = setup({ bundle_dir: createBundleDir(declarations) });
    supervisor.start();
    expect(supervisor.getFeatureFlagDefinitions('alerting_v2:cleanup')).toEqual(declarations);
    expect(supervisor.getFeatureFlagDefinitions('task_manager:nodes')).toBeUndefined();
    const pending = acquire('alerting_v2:cleanup');
    ready(0, 4567, declarations);
    (await pending).release();
    await supervisor.stop();
  });

  const mismatchedRuntimeFlags: TaskFeatureFlagDefinitions[] = [
    { 'sdk.enabled': true },
    { 'sdk.enabled': false, 'sdk.new': false },
  ];
  it.each(mismatchedRuntimeFlags)(
    'refuses worker code that differs from its shipped flag metadata: %j',
    async (runtimeFlags) => {
      const { supervisor, acquire, ready, children } = setup({
        bundle_dir: createBundleDir({ 'sdk.enabled': false }),
      });
      supervisor.start();
      const pending = acquire('alerting_v2:cleanup');
      ready(0, 4567, runtimeFlags);
      await expect(pending).rejects.toMatchObject({ reason: 'incompatible' });
      expect(children[0].child.kill).toHaveBeenCalled();
      await supervisor.stop();
    }
  );

  it('reuses a compatible child sequentially and retires it at the run limit', async () => {
    const { supervisor, children, forkFn, acquire, ready } = setup({ reuse });
    supervisor.start();
    const pending = acquire('alerting_v2:cleanup');
    ready(0);
    const first = await pending;
    first.release({ reusable: true });
    expect(children[0].child.kill).not.toHaveBeenCalled();
    const second = await acquire('alerting_v2:cleanup');
    expect(second.url).toBe(first.url);
    expect(forkFn).toHaveBeenCalledTimes(1);
    // A stale lease must not release or kill the next run's child.
    first.release({ force: true });
    expect(supervisor.getStats().active).toBe(1);
    expect(children[0].child.kill).not.toHaveBeenCalled();
    second.release({ reusable: true });
    const third = await acquire('alerting_v2:cleanup');
    third.release({ reusable: true });
    expect(children[0].child.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it.each([
    ['idle timeout', { ...reuse, idleTimeoutMs: 100 }],
    ['maximum age', { ...reuse, maxAgeMs: 100 }],
  ])('retires an idle child at its %s', async (_name, policy) => {
    jest.useFakeTimers();
    const { supervisor, children, acquire, ready } = setup({ reuse: policy });
    supervisor.start();
    const pending = acquire('alerting_v2:cleanup');
    ready(0);
    const lease = await pending;
    lease.release({ reusable: true });
    jest.advanceTimersByTime(100);
    expect(children[0].child.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('never shares a busy child or an idle child of a different task type', async () => {
    const { supervisor, forkFn, acquire, ready } = setup({ reuse });
    supervisor.start();
    const first = acquire('alerting_v2:cleanup');
    ready(0);
    const busy = await first;
    const second = acquire('alerting_v2:cleanup');
    ready(1);
    const other = await second;
    busy.release({ reusable: true });
    const third = acquire('task_manager:nodes');
    ready(2);
    const different = await third;
    expect(forkFn).toHaveBeenCalledTimes(3);
    other.release();
    different.release();
    await supervisor.stop();
  });

  it('retires idle children when startup settings change', async () => {
    let encryptionKey = 'a'.repeat(32);
    const { supervisor, children, forkFn, acquire, ready } = setup({
      reuse,
      getInitFor: () => ({ encryptedSavedObjects: { encryptionKey, decryptionOnlyKeys: [] } }),
    });
    supervisor.start();
    const first = acquire('alerting_v2:cleanup');
    ready(0);
    (await first).release({ reusable: true });
    encryptionKey = 'b'.repeat(32);
    const second = acquire('alerting_v2:cleanup');
    ready(1);
    const lease = await second;
    expect(forkFn).toHaveBeenCalledTimes(2);
    expect(children[0].child.kill).toHaveBeenCalledWith('SIGTERM');
    lease.release();
  });

  it('initializes and reuses workers from the dispatch snapshot', async () => {
    const getInitFor = jest.fn();
    const { supervisor, children, forkFn, ready } = setup({ reuse, getInitFor });
    supervisor.start();
    const snapshot: TaskProcessDispatchSnapshot = {
      protocolVersion: TASK_PROCESS_PROTOCOL_VERSION,
      init: {
        kibanaVersion: '9.9.9',
        elasticsearch: { hosts: ['http://dispatch-es:9200'] } as never,
        settings: { contributed: { enabled: true } },
        parity: [{ kind: 'tools', ids: ['tool1'] }],
      },
      featureFlags: { flag: true },
    };
    const route = supervisor.getRoute('alerting_v2:cleanup');
    if (!('acquire' in route)) throw new Error('Expected a supervised route');
    const first = route.acquire({ snapshot });
    ready(0);
    (await first).release({ reusable: true });
    expect(children[0].child.send).toHaveBeenCalledWith(expect.objectContaining(snapshot.init));
    expect(getInitFor).not.toHaveBeenCalled();
    const second = await route.acquire({
      snapshot: { ...snapshot, featureFlags: { flag: false } },
    });
    expect(forkFn).toHaveBeenCalledTimes(1);
    second.release({ reusable: true });
    const third = route.acquire({
      snapshot: {
        ...snapshot,
        init: { ...snapshot.init, settings: { contributed: { enabled: false } } },
      },
    });
    ready(1);
    (await third).release();
    expect(forkFn).toHaveBeenCalledTimes(2);
    expect(children[0].child.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('bounds idle children globally and kills cancelled reused children', async () => {
    const { supervisor, children, acquire, ready } = setup({
      reuse: { ...reuse, maxIdleProcesses: 1 },
    });
    supervisor.start();
    const first = acquire('alerting_v2:cleanup');
    ready(0);
    const a = await first;
    const second = acquire('alerting_v2:cleanup');
    ready(1);
    const b = await second;
    a.release({ reusable: true });
    b.release({ reusable: true });
    expect(children[1].child.kill).toHaveBeenCalledWith('SIGTERM');
    const reused = await acquire('alerting_v2:cleanup');
    reused.release({ force: true });
    expect(children[0].child.kill).toHaveBeenCalledWith('SIGKILL');
    expect(supervisor.getStats().live).toBe(0);
  });

  it('does not retain failed runs or children that exit while idle', async () => {
    const { supervisor, children, forkFn, acquire, ready } = setup({ reuse });
    supervisor.start();
    const first = acquire('alerting_v2:cleanup');
    ready(0);
    (await first).release({ reusable: false });
    expect(children[0].child.kill).toHaveBeenCalledWith('SIGTERM');
    const second = acquire('alerting_v2:cleanup');
    ready(1);
    (await second).release({ reusable: true });
    children[1].child.kill('SIGTERM');
    const third = acquire('alerting_v2:cleanup');
    ready(2);
    (await third).release();
    expect(forkFn).toHaveBeenCalledTimes(3);
  });

  it('routes the task types the bundles serve and starts no process', () => {
    const { supervisor, forkFn } = setup();
    supervisor.start();
    expect(supervisor.getRoute('alerting_v2:cleanup')).toEqual({ acquire: expect.any(Function) });
    expect(supervisor.getRoute('task_manager:nodes')).toEqual({ acquire: expect.any(Function) });
    expect(supervisor.getRoute('other:type')).toEqual({ acquire: expect.any(Function) });
    expect(forkFn).not.toHaveBeenCalled();
  });

  it('rejects an unavailable bundle without spawning a process', async () => {
    const { supervisor, acquire, forkFn } = setup();
    supervisor.start();
    await expect(acquire('other:type')).rejects.toMatchObject({ reason: 'not_served' });
    expect(forkFn).not.toHaveBeenCalled();
  });

  it('does not require a bundle for every registered task type; an unbundled one is simply not served', () => {
    const { supervisor } = setup();
    expect(() => supervisor.start(['workflow:run'])).not.toThrow();
    expect(supervisor.serves('workflow:run')).toBe(false);
    expect(supervisor.serves('alerting_v2:cleanup')).toBe(true);
    expect(supervisor.getRoute('workflow:run')).toBeDefined();
  });

  it('throws when a manifest entry points at a bundle file that does not exist', () => {
    const dir = mkdtempSync(join(tmpdir(), 'task-bundles-'));
    writeFileSync(
      join(dir, 'manifest.json'),
      JSON.stringify({ bundles: { a: { file: 'missing.js', taskType: 'alerting_v2:cleanup' } } })
    );
    const supervisor = new TaskProcessSupervisor({
      settings: {
        bundle_dir: dir,
        kibanaVersion: '9.9.9',
        getElasticsearchConfig: () => ({ hosts: ['http://es:9200'] } as never),
      },
      logger: loggingSystemMock.createLogger(),
    });
    expect(() => supervisor.start()).toThrow('Missing task bundle files for alerting_v2:cleanup');
  });

  it('starts the bundle for a run, with the settings sent over the fork channel', async () => {
    const { supervisor, children, forkFn, acquire, ready } = setup();
    supervisor.start();
    const lease = acquire('alerting_v2:cleanup');
    expect(forkFn).toHaveBeenCalledTimes(1);
    expect(forkFn.mock.calls[0][0]).toMatch(/a\.js$/);
    expect(Object.keys(children[0].env)).not.toContain('ES_URL');
    expect(children[0].child.send).toHaveBeenCalledWith({
      kind: 'init',
      elasticsearch: { hosts: ['http://es:9200'] },
      kibanaVersion: '9.9.9',
      authToken: expect.stringMatching(/^[0-9a-f]{64}$/),
      server: { uuid: 'uuid', buildNum: 1, isServerless: false },
      encryptedSavedObjects: { encryptionKey: 'k'.repeat(32), decryptionOnlyKeys: [] },
    });

    // What another task type declared is not sent to this one.
    const other = acquire('task_manager:nodes');
    expect(children[1].child.send.mock.calls[0][0]).not.toHaveProperty('encryptedSavedObjects');
    ready(1);
    await other;

    ready(0);
    const { url, token } = await lease;
    expect(url).toBe('http://127.0.0.1:4567');
    expect(token).toBe(
      (children[0].child.send.mock.calls[0][0] as { authToken: string }).authToken
    );
  });

  it('reads what Kibana has now before it starts the process, and starts none when that fails', async () => {
    const getInitFor = jest
      .fn()
      .mockResolvedValueOnce({ parity: [{ kind: 'connectorTypes', ids: ['.email'] }] })
      .mockRejectedValueOnce(new Error('cannot read the overrides'));
    const forkFn = jest.fn(() => new FakeChild());
    const supervisor = new TaskProcessSupervisor({
      settings: {
        bundle_dir: createBundleDir(),
        kibanaVersion: '9.9.9',
        getElasticsearchConfig: () => ({ hosts: ['http://es:9200'] } as never),
        getInitFor,
      },
      logger: loggingSystemMock.createLogger(),
      forkFn: forkFn as never,
    });
    supervisor.start();
    const route = supervisor.getRoute('alerting_v2:cleanup') as {
      acquire: () => Promise<TaskProcessLease>;
    };

    const first = route.acquire();
    await new Promise((resolve) => setImmediate(resolve));
    const child = forkFn.mock.results[0].value as FakeChild;
    expect(child.send).toHaveBeenCalledWith(
      expect.objectContaining({ parity: [{ kind: 'connectorTypes', ids: ['.email'] }] })
    );
    child.emit('message', {
      kind: 'ready',
      port: 1,
      protocolVersion: TASK_PROCESS_PROTOCOL_VERSION,
      capabilities: TASK_PROCESS_CAPABILITIES,
    });
    await first;

    await expect(route.acquire()).rejects.toThrow('cannot read the overrides');
    expect(forkFn).toHaveBeenCalledTimes(1);
  });

  it('gives each run a process of its own and stops it when the run ends', async () => {
    const { supervisor, children, forkFn, acquire, ready } = setup();
    supervisor.start();
    const first = acquire('alerting_v2:cleanup');
    const second = acquire('alerting_v2:cleanup');
    ready(0, 4001);
    ready(1, 4002);
    const [a, b] = await Promise.all([first, second]);
    expect(forkFn).toHaveBeenCalledTimes(2);
    expect([a.url, b.url]).toEqual(['http://127.0.0.1:4001', 'http://127.0.0.1:4002']);

    a.release();
    expect(children[0].child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(children[1].child.kill).not.toHaveBeenCalled();
  });

  it('kills a cancelled process immediately without waiting for a timer', async () => {
    const { supervisor, children, acquire, ready } = setup();
    supervisor.start();
    const pending = acquire('alerting_v2:cleanup');
    ready(0);
    const lease = await pending;
    lease.release({ force: true });
    expect(children[0].child.kill).toHaveBeenCalledTimes(1);
    expect(children[0].child.kill).toHaveBeenCalledWith('SIGKILL');
    lease.release({ force: true });
    expect(children[0].child.kill).toHaveBeenCalledTimes(1);
    expect(supervisor.getStats().active).toBe(0);
  });

  it('rejects a run, and stops the process, when it exits before it is ready', async () => {
    const { supervisor, children, acquire } = setup();
    supervisor.start();
    const failed = acquire('alerting_v2:cleanup');
    children[0].child.emit('exit', 1, null);
    await expect(failed).rejects.toThrow(/before it was ready/);
  });

  it.each([
    {},
    { protocolVersion: 1, capabilities: TASK_PROCESS_CAPABILITIES },
    { protocolVersion: 2, capabilities: TASK_PROCESS_CAPABILITIES },
    { protocolVersion: TASK_PROCESS_PROTOCOL_VERSION, capabilities: [] },
  ])('rejects incompatible readiness before leasing a child: %j', async (protocol) => {
    const { supervisor, children, acquire } = setup();
    supervisor.start();
    const pending = acquire('alerting_v2:cleanup');
    children[0].child.emit('message', { kind: 'ready', port: 4567, ...protocol });
    await expect(pending).rejects.toMatchObject({ reason: 'incompatible' });
    expect(children[0].child.kill).toHaveBeenCalledWith('SIGTERM');
    await supervisor.stop();
  });

  it('kills a process that does not become ready', async () => {
    jest.useFakeTimers();
    const { supervisor, children, acquire } = setup();
    supervisor.start();
    const failed = acquire('alerting_v2:cleanup');
    jest.advanceTimersByTime(30_000);
    expect(children[0].child.kill).toHaveBeenCalledWith('SIGKILL');
    await expect(failed).rejects.toThrow(/ready/);
  });

  it('rejects process acquisition and terminates running processes on stop', async () => {
    const { supervisor, children, acquire, ready } = setup({ drainTimeoutMs: 10 });
    supervisor.start();
    const pending = acquire('alerting_v2:cleanup');
    ready(0);
    await pending;
    await supervisor.stop();
    expect(children[0].child.kill).toHaveBeenCalledWith('SIGTERM');
    await expect(acquire('alerting_v2:cleanup')).rejects.toMatchObject({ reason: 'unavailable' });
  });

  it('declines a run past max_concurrent_processes with the capacity reason, and takes it again when one is released', async () => {
    const { supervisor, children, acquire, ready } = setup({ maxConcurrentProcesses: 2 });
    supervisor.start();
    const first = acquire('alerting_v2:cleanup');
    const second = acquire('alerting_v2:cleanup');
    // Held before they are ready, so runs that start together cannot pass the cap.
    await expect(acquire('alerting_v2:cleanup')).rejects.toMatchObject({ reason: 'capacity' });
    ready(0);
    ready(1);
    const [a] = await Promise.all([first, second]);
    expect(supervisor.getStats()).toMatchObject({
      live: 2,
      peakLive: 2,
      active: 2,
      max: 2,
      spawned: 2,
      capacityRejections: 1,
    });

    a.release();
    const third = acquire('alerting_v2:cleanup');
    ready(2);
    await third;
    expect(children).toHaveLength(3);
    expect(supervisor.getStats().active).toBe(2);
    // The third process starts after the first is released, so live never exceeds two at once.
    expect(supervisor.getStats().peakLive).toBe(2);
  });

  it('frees its place when a process cannot be started, and reports why', async () => {
    jest.useFakeTimers();
    const { supervisor, children, acquire } = setup({ maxConcurrentProcesses: 1 });
    supervisor.start();
    const exited = acquire('alerting_v2:cleanup');
    children[0].child.emit('exit', 1, null);
    await expect(exited).rejects.toMatchObject({ reason: 'spawn_failed' });

    const timedOut = acquire('alerting_v2:cleanup');
    jest.advanceTimersByTime(30_000);
    await expect(timedOut).rejects.toMatchObject({ reason: 'spawn_timeout' });
    expect(supervisor.getStats()).toMatchObject({
      active: 0,
      spawnFailures: 1,
      spawnTimeouts: 1,
    });
  });

  it('reports a process that cannot be spawned instead of crashing on its error event', async () => {
    const { supervisor, children, acquire } = setup();
    supervisor.start();
    const failed = acquire('alerting_v2:cleanup');
    children[0].child.emit('error', new Error('spawn ENOENT'));
    await expect(failed).rejects.toMatchObject({ reason: 'spawn_failed' });
    // And a later error event has a listener.
    expect(() => children[0].child.emit('error', new Error('again'))).not.toThrow();
  });

  it('starts a process without the inspector and heap flags of Kibana, and with the configured heap', async () => {
    process.env.NODE_OPTIONS = '--max-old-space-size=8192 --enable-source-maps';
    const argv = jest.replaceProperty(process, 'execArgv', ['--inspect=9229', '--no-warnings']);
    try {
      const { supervisor, children, acquire } = setup({ childMaxOldSpaceMb: 256 });
      supervisor.start();
      acquire('alerting_v2:cleanup').catch(() => undefined);
      await new Promise((resolve) => setImmediate(resolve));
      expect(children[0].execArgv).toEqual([
        '--no-warnings',
        '--max-old-space-size=256',
        '--max-semi-space-size=2',
      ]);
      expect(children[0].env.NODE_OPTIONS).toBe('--enable-source-maps');
      expect(children[0].env.TASK_PROCESS_LOG_LAYOUT).toBe('json');
      expect(children[0].env.TASK_PROCESS_LOG_LEVEL).toBeDefined();
    } finally {
      argv.restore();
    }
  });

  it('does not pass NODE_OPTIONS on when only heap flags were in it', async () => {
    process.env.NODE_OPTIONS = '--max-old-space-size=8192';
    const { supervisor, children, acquire } = setup();
    supervisor.start();
    acquire('alerting_v2:cleanup').catch(() => undefined);
    await new Promise((resolve) => setImmediate(resolve));
    expect(children[0].env).not.toHaveProperty('NODE_OPTIONS');
  });

  it('on stop rejects new runs, lets a run in flight finish, and kills nothing that finishes in time', async () => {
    jest.useFakeTimers();
    const { supervisor, children, ready } = setup({ drainTimeoutMs: 10_000 });
    supervisor.start();
    const route = supervisor.getRoute('alerting_v2:cleanup') as {
      acquire: () => Promise<TaskProcessLease>;
    };
    const pending = route.acquire();
    ready(0);
    const lease = await pending;
    const stopped = supervisor.stop();
    await expect(route.acquire()).rejects.toMatchObject({ reason: 'unavailable' });
    jest.advanceTimersByTime(5000);
    expect(children[0].child.kill).not.toHaveBeenCalled();
    lease.release();
    await stopped;
    expect(children[0].child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(children[0].child.kill).not.toHaveBeenCalledWith('SIGKILL');
  });

  it('on stop kills the processes that outlive the drain bound', async () => {
    jest.useFakeTimers();
    const { supervisor, children, acquire, ready } = setup({ drainTimeoutMs: 10_000 });
    supervisor.start();
    const pending = acquire('alerting_v2:cleanup');
    ready(0);
    await pending;
    // A process that ignores SIGTERM.
    children[0].child.kill.mockImplementation((signal?: string) => {
      if (signal === 'SIGKILL') {
        children[0].child.exitCode = 0;
        children[0].child.emit('exit', null, signal);
      }
      return true;
    });
    const stopped = supervisor.stop();
    await jest.advanceTimersByTimeAsync(10_000);
    expect(children[0].child.kill).toHaveBeenCalledWith('SIGTERM');
    await jest.advanceTimersByTimeAsync(2_000);
    await stopped;
    expect(children[0].child.kill).toHaveBeenCalledWith('SIGKILL');
  });

  it('throws a clear error when the bundle directory has no manifest', () => {
    const supervisor = new TaskProcessSupervisor({
      settings: {
        bundle_dir: join(tmpdir(), 'does-not-exist'),
        kibanaVersion: '9.9.9',
        getElasticsearchConfig: () => ({ hosts: ['http://es:9200'] } as never),
      },
      logger: loggingSystemMock.createLogger(),
    });
    expect(() => supervisor.start()).toThrow(/No task bundle manifest/);
  });
});
