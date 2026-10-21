/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Worker } from 'worker_threads';
import { fork } from 'child_process';
import type { Packet } from './protocol';

export interface Endpoint {
  send(packet: Packet): void;
  onMessage(handler: (packet: Packet) => void): void;
  onExit(handler: () => void): void;
  stop(): Promise<void>;
}

/**
 * A forked child is a new process, so its argv `--max-old-space-size` is its own
 * V8 flag. Unset, the child keeps the parent's execArgv.
 */
const processForkOptions = (): { execArgv?: string[]; env?: NodeJS.ProcessEnv } => {
  const raw = process.env.T7P_PROCESS_OLD_SPACE_MB;
  if (!raw || !/^[1-9]\d{0,4}$/.test(raw)) return {};
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

/** Adapts thread ports and advanced-serialization child IPC to the same protocol. */
export const startEndpoint = (transport: 'thread' | 'process'): Endpoint => {
  const entry = require.resolve('./worker_bootstrap');
  if (transport === 'thread') {
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
    ...processForkOptions(),
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
