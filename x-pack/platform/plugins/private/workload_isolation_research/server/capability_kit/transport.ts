/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fork } from 'child_process';
import { setFlagsFromString } from 'v8';
import { Worker } from 'worker_threads';
import type { Packet } from './protocol';

export interface Endpoint {
  send(packet: Packet): void;
  onMessage(handler: (packet: Packet) => void): void;
  onExit(handler: () => void): void;
  stop(): Promise<void>;
}

/**
 * A forked child is a new process, so its argv `--max-old-space-size` is its own
 * V8 flag. An explicit cap beats the image env. Unset, the child keeps the parent's execArgv.
 */
export const resolveChildOldSpaceMb = (
  cap: number | undefined,
  envValue: string | undefined
): string | undefined => {
  if (cap != null && Number.isInteger(cap) && cap >= 128 && cap <= 2048) return String(cap);
  if (envValue && /^[1-9]\d{0,4}$/.test(envValue)) return envValue;
  return undefined;
};

const processForkOptions = (cap?: number): { execArgv?: string[]; env?: NodeJS.ProcessEnv } => {
  const raw = resolveChildOldSpaceMb(cap, process.env.T7P_PROCESS_OLD_SPACE_MB);
  if (!raw) return {};
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (typeof env.NODE_OPTIONS === 'string') {
    env.NODE_OPTIONS = env.NODE_OPTIONS.replace(/--max-old-space-size(?:=|\s+)\d+/g, '').trim();
  }
  return {
    execArgv: [
      ...process.execArgv.filter((arg) => !String(arg).includes('max-old-space-size')),
      `--max-old-space-size=${raw}`,
    ],
    env,
  };
};

const parentOldSpaceFlag = (): number | null => {
  const source = `${process.env.NODE_OPTIONS ?? ''} ${process.execArgv.join(' ')}`;
  const match = source.match(/--max-old-space-size(?:=|\s+)(\d+)/);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) ? value : null;
};

const isThreadCap = (value: number | undefined): value is number =>
  value != null && Number.isInteger(value) && value >= 128 && value <= 2048;

let threadWindowOpen = false;
const threadWindowQueue: Array<() => void> = [];

const releaseThreadWindow = (): void => {
  threadWindowOpen = false;
  const next = threadWindowQueue.shift();
  if (next) next();
};

/**
 * UNSUPPORTED-API RESEARCH SHIM.
 * Clears the parent old-space flag only for this Worker constructor, then restores it
 * on online. Callers that overlap are queued so the flag is never cleared twice.
 */
export const startCappedThread = (filename: string, capMb: number): Worker => {
  if (threadWindowOpen) {
    throw new Error('thread old-space window is already open');
  }
  threadWindowOpen = true;
  const saved = parentOldSpaceFlag();
  let worker: Worker;
  try {
    setFlagsFromString('--max-old-space-size=0');
    worker = new Worker(filename, {
      resourceLimits: { maxOldGenerationSizeMb: capMb },
    });
  } catch (error) {
    if (saved != null) setFlagsFromString(`--max-old-space-size=${saved}`);
    releaseThreadWindow();
    throw error;
  }
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    if (saved != null) setFlagsFromString(`--max-old-space-size=${saved}`);
    releaseThreadWindow();
  };
  worker.once('online', close);
  worker.once('exit', close);
  worker.once('error', close);
  return worker;
};

const startCappedThreadEndpoint = (filename: string, capMb: number): Endpoint => {
  let worker: Worker | undefined;
  const messageHandlers: Array<(packet: Packet) => void> = [];
  const exitHandlers: Array<() => void> = [];
  const queuedPackets: Packet[] = [];
  const bind = (created: Worker) => {
    worker = created;
    created.on('error', () => undefined);
    for (const handler of messageHandlers) created.on('message', handler);
    for (const handler of exitHandlers) created.once('exit', handler);
    for (const packet of queuedPackets.splice(0)) created.postMessage(packet);
  };
  const open = () => bind(startCappedThread(filename, capMb));
  if (threadWindowOpen) threadWindowQueue.push(open);
  else open();
  return {
    send: (packet) => {
      if (!worker) {
        queuedPackets.push(packet);
        return;
      }
      worker.postMessage(packet);
    },
    onMessage: (handler) => {
      messageHandlers.push(handler);
      worker?.on('message', handler);
    },
    onExit: (handler) => {
      exitHandlers.push(handler);
      worker?.once('exit', handler);
    },
    stop: async () => {
      await worker?.terminate();
    },
  };
};

/** Adapts thread ports and advanced-serialization child IPC to the same protocol. */
export const startEndpoint = (
  transport: 'thread' | 'process',
  processOldSpaceMb?: number,
  threadOldSpaceMb?: number
): Endpoint => {
  const entry = require.resolve('./worker_bootstrap');
  if (transport === 'thread') {
    if (isThreadCap(threadOldSpaceMb)) return startCappedThreadEndpoint(entry, threadOldSpaceMb);
    const worker = new Worker(entry);
    worker.on('error', () => undefined);
    return {
      send: (packet) => worker.postMessage(packet),
      onMessage: (handler) => {
        worker.on('message', handler);
      },
      onExit: (handler) => {
        worker.once('exit', handler);
      },
      stop: async () => {
        await worker.terminate();
      },
    };
  }
  const child = fork(entry, [], {
    serialization: 'advanced',
    stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    ...processForkOptions(processOldSpaceMb),
  });
  child.on('error', () => undefined);
  return {
    send: (packet) => {
      if (!child.connected) throw new Error('Capability child disconnected');
      child.send(packet, (error) => {
        if (error) child.kill('SIGKILL');
      });
    },
    onMessage: (handler) => {
      child.on('message', handler);
    },
    onExit: (handler) => {
      child.once('exit', handler);
    },
    stop: () =>
      new Promise<void>((resolve) => {
        if (child.exitCode !== null || child.signalCode !== null) return resolve();
        child.once('exit', () => resolve());
        child.kill('SIGKILL');
      }),
  };
};
