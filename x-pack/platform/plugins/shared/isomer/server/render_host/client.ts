/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fork, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';
import { clearTimeout, setTimeout } from 'node:timers';

import type { Composition } from '@elastic/isomer-sdk';
import type { MapGeometry } from '@kbn/isomer-primitives-maps';

import type { DrawMessage, HostDrawOptions, HostReply, InitMessage } from './protocol';

const entry = join(__dirname, __filename.endsWith('.ts') ? 'main_src_harness.js' : 'main.js');

export interface RenderHostOptions {
  /** Boundary files for the maps pack, sent once when the process starts. */
  geometry?: MapGeometry;
  /** How long the process may sit idle before it exits. Defaults to a minute. */
  idleMs?: number;
  /** The process's V8 old-space cap, in MB. Defaults to 256. */
  heapMb?: number;
  /** How long one PNG may take before the process is killed and the PNG rejected. Defaults to a minute. */
  jobTimeoutMs?: number;
}

export interface RenderHost {
  /** Draws `composition` as a PNG in the render process, started if it is not running. One PNG at a time. */
  drawPng(composition: Composition, options?: HostDrawOptions): Promise<Buffer>;
  /** The running process's id, if one is running. */
  readonly pid: number | undefined;
  /** Stops the process; a draw after this rejects. */
  close(): Promise<void>;
}

interface Running {
  child: ChildProcess;
  ready: Promise<void>;
}

/**
 * Draws PNGs in a forked render process that owns every drawing engine, so their memory leaves Kibana's process
 * when it exits. It starts on the first PNG, draws charts in its own main thread, and exits after `idleMs` idle.
 */
export const createRenderHost = ({
  geometry = {},
  idleMs = 60_000,
  heapMb = 256,
  jobTimeoutMs = 60_000,
}: RenderHostOptions = {}): RenderHost => {
  let running: Running | undefined;
  let idle: NodeJS.Timeout | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  let nextId = 0;
  let closed = false;

  const stop = (child: ChildProcess) => {
    if (running?.child === child) {
      running = undefined;
    }
    child.kill();
  };

  const start = (): Running => {
    const child = fork(entry, [], {
      execArgv: ['--disallow-code-generation-from-strings', `--max-old-space-size=${heapMb}`],
      serialization: 'advanced',
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    });
    child.on('exit', () => {
      if (running?.child === child) {
        running = undefined;
      }
    });
    const ready = new Promise<void>((resolve, reject) => {
      const onExit = (code: number | null) =>
        reject(new Error(`the render process exited before it was ready (${code})`));
      child.once('exit', onExit);
      child.once('message', (reply: HostReply) => {
        child.off('exit', onExit);
        if (reply.type === 'ready') {
          resolve();
        } else {
          stop(child);
          reject(new Error(reply.type === 'failed' ? reply.error : 'unexpected reply'));
        }
      });
    });
    child.send({ type: 'init', geometry } satisfies InitMessage);
    return { child, ready };
  };

  const draw = async (composition: Composition, options: HostDrawOptions): Promise<Buffer> => {
    if (closed) {
      throw new Error('the render host is closed');
    }
    clearTimeout(idle);
    running ??= start();
    const { child, ready } = running;
    await ready;
    nextId += 1;
    const id = nextId;
    try {
      return await new Promise<Buffer>((resolve, reject) => {
        const timer = setTimeout(() => {
          stop(child);
          reject(new Error(`the render process took over ${jobTimeoutMs} ms`));
        }, jobTimeoutMs);
        const onExit = (code: number | null) => {
          clearTimeout(timer);
          reject(new Error(`the render process exited while drawing (${code})`));
        };
        const onMessage = (reply: HostReply) => {
          if (!('id' in reply) || reply.id !== id) {
            return;
          }
          clearTimeout(timer);
          child.off('exit', onExit);
          child.off('message', onMessage);
          if (reply.type === 'drawn') {
            resolve(Buffer.from(reply.png.buffer, reply.png.byteOffset, reply.png.byteLength));
          } else {
            reject(new Error(reply.error));
          }
        };
        child.once('exit', onExit);
        child.on('message', onMessage);
        child.send({ type: 'draw', id, composition, options } satisfies DrawMessage);
      });
    } finally {
      if (running?.child === child) {
        idle = setTimeout(() => stop(child), idleMs);
        idle.unref();
      }
    }
  };

  return {
    drawPng: (composition, options = {}) => {
      const job = queue.then(() => draw(composition, options));
      queue = job.catch(() => undefined);
      return job;
    },
    get pid() {
      return running?.child.pid;
    },
    close: async () => {
      closed = true;
      clearTimeout(idle);
      const child = running?.child;
      running = undefined;
      if (child && child.exitCode === null) {
        const exited = new Promise((resolve) => child.once('exit', resolve));
        child.kill();
        await exited;
      }
    },
  };
};
