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
