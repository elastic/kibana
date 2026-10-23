/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';

import { createRenderHost, type RenderHost } from './client';

const composition = {
  type: 'view',
  body: [
    {
      type: 'xyChart',
      title: 'Requests by host',
      x: { type: 'category', title: 'Host' },
      y: { title: 'Requests' },
      series: [
        {
          label: '2xx',
          kind: 'bar',
          points: [
            { x: 'web-01', y: 1240 },
            { x: 'web-02', y: 980 },
          ],
        },
      ],
    },
  ],
} as unknown as Composition;

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const exited = (pid: number) =>
  new Promise<void>((resolve) => {
    const poll = setInterval(() => {
      try {
        process.kill(pid, 0);
      } catch {
        clearInterval(poll);
        resolve();
      }
    }, 50);
  });

describe('createRenderHost', () => {
  jest.setTimeout(120_000);
  let host: RenderHost;

  afterEach(() => host?.close());

  it('draws PNGs in a child process, one at a time', async () => {
    host = createRenderHost();
    expect(host.pid).toBeUndefined();
    const [first, second] = await Promise.all([
      host.drawPng(composition),
      host.drawPng(composition, { scale: 2 }),
    ]);
    expect(first.subarray(0, 4)).toEqual(PNG);
    expect(second.subarray(0, 4)).toEqual(PNG);
    expect(second.length).toBeGreaterThan(first.length);
    expect(host.pid).not.toBe(process.pid);
  });

  it('starts a new process after its process dies, and exits when idle', async () => {
    host = createRenderHost({ idleMs: 200 });
    await host.drawPng(composition);
    const killed = host.pid!;
    process.kill(killed);
    await exited(killed);
    await expect(host.drawPng(composition)).resolves.toBeInstanceOf(Buffer);
    const restarted = host.pid!;
    expect(restarted).not.toBe(killed);
    await exited(restarted);
    expect(host.pid).toBeUndefined();
  });

  it('rejects a composition it cannot draw, keeps drawing, and rejects after close', async () => {
    host = createRenderHost();
    await expect(
      host.drawPng({ type: 'view', body: [{ type: 'nope' }] } as unknown as Composition)
    ).rejects.toThrow();
    await expect(host.drawPng(composition)).resolves.toBeInstanceOf(Buffer);
    await host.close();
    await expect(host.drawPng(composition)).rejects.toThrow(/closed/);
  });
});
