/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parentPort } from 'node:worker_threads';
import { setTimeout as delay } from 'node:timers/promises';
import type { ExecutorMessage, RunCommand } from './protocol.ts';

const send = (message: ExecutorMessage): void => {
  if (parentPort) parentPort.postMessage(message);
  else if (process.send) process.send(message);
  else throw new Error('Executor requires an IPC parent');
};

const execute = async (command: RunCommand): Promise<void> => {
  const started = performance.now();
  if (command.fixture === 'stale_first') {
    send({
      kind: 'result',
      generation: command.generation - 1,
      durationMs: 0,
      consumedBytes: 0,
      heapUsed: process.memoryUsage().heapUsed,
    });
  }
  if (command.fixture === 'infinite') {
    for (;;) {
      performance.now();
    }
  }
  if (command.fixture === 'spin') {
    // Deliberately uncooperative: only parent termination can stop this fixture.
    while (performance.now() - started < command.durationMs) {
      performance.now();
    }
  } else {
    await delay(command.durationMs);
  }
  const bytes = command.fixture === 'bytes' ? Buffer.alloc(command.bytes, 1) : Buffer.alloc(0);
  const consumedBytes = bytes.byteLength;
  send({
    kind: 'result',
    generation: command.generation,
    durationMs: performance.now() - started,
    consumedBytes,
    heapUsed: process.memoryUsage().heapUsed,
  });
};

if (parentPort) parentPort.on('message', (command: RunCommand) => void execute(command));
else process.on('message', (command: RunCommand) => void execute(command));

send({ kind: 'ready', ...process.memoryUsage() });
