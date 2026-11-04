/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventEmitter } from 'events';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { TaskProcessLease } from './remote_task_runner';
import { TaskProcessSupervisor } from './supervisor';

const createBundleDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'task-bundles-'));
  writeFileSync(
    join(dir, 'manifest.json'),
    JSON.stringify({
      bundles: {
        a: { file: 'a.js', taskType: 'alerting_v2:cleanup' },
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
  const setup = () => {
    const children: Array<{ file: string; env: NodeJS.ProcessEnv; child: FakeChild }> = [];
    const forkFn = jest.fn((file: string, _args: unknown, options: { env: NodeJS.ProcessEnv }) => {
      const child = new FakeChild();
      children.push({ file, env: options.env, child });
      return child;
    });
    const supervisor = new TaskProcessSupervisor({
      settings: {
        bundle_dir: createBundleDir(),
        kibanaVersion: '9.9.9',
        getElasticsearchConfig: () => ({ hosts: ['http://es:9200'] } as never),
      },
      logger: loggingSystemMock.createLogger(),
      forkFn: forkFn as never,
    });
    const acquire = (type: string) =>
      (supervisor.getRoute(type) as { acquire: () => Promise<TaskProcessLease> }).acquire();
    const ready = (index: number, port = 4567) =>
      children[index].child.emit('message', { kind: 'ready', port });
    return { supervisor, children, forkFn, acquire, ready };
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  it('routes the task types the bundles serve and starts no process', () => {
    const { supervisor, forkFn } = setup();
    supervisor.start();
    expect(supervisor.getRoute('alerting_v2:cleanup')).toEqual({ acquire: expect.any(Function) });
    expect(supervisor.getRoute('task_manager:nodes')).toEqual({ acquire: expect.any(Function) });
    expect(supervisor.getRoute('other:type')).toBeUndefined();
    expect(forkFn).not.toHaveBeenCalled();
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
    });

    ready(0);
    const { url, token } = await lease;
    expect(url).toBe('http://127.0.0.1:4567');
    expect(token).toBe(
      (children[0].child.send.mock.calls[0][0] as { authToken: string }).authToken
    );
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

  it('rejects a run, and stops the process, when it exits before it is ready', async () => {
    const { supervisor, children, acquire } = setup();
    supervisor.start();
    const failed = acquire('alerting_v2:cleanup');
    children[0].child.emit('exit', 1, null);
    await expect(failed).rejects.toThrow(/before it was ready/);
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

  it('stops routing and terminates the running processes on stop', async () => {
    const { supervisor, children, acquire, ready } = setup();
    supervisor.start();
    const pending = acquire('alerting_v2:cleanup');
    ready(0);
    await pending;
    await supervisor.stop();
    expect(children[0].child.kill).toHaveBeenCalledWith('SIGTERM');
    expect(supervisor.getRoute('alerting_v2:cleanup')).toBeUndefined();
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
