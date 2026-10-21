/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* RESEARCH ONLY. Child of thread_cap.node_test.ts. Prints one JSON line. */

import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Worker } from 'worker_threads';
import { getHeapStatistics } from 'v8';
import { startCappedThread } from './transport';

const workerSource = `'use strict';
const { parentPort } = require('worker_threads');
const { getHeapStatistics } = require('v8');
parentPort.postMessage(getHeapStatistics().heap_size_limit);
`;

const limitOf = (worker: Worker): Promise<number> =>
  new Promise((resolve, reject) => {
    worker.once('message', (value: unknown) => {
      if (typeof value !== 'number') {
        reject(new Error('worker heap limit was not a number'));
        return;
      }
      resolve(value);
    });
    worker.once('error', reject);
  });

const main = async (): Promise<void> => {
  const dir = mkdtempSync(join(tmpdir(), 't7p-thread-cap-'));
  const filename = join(dir, 'worker.js');
  writeFileSync(filename, workerSource);
  const mainBefore = getHeapStatistics().heap_size_limit;
  const capped = startCappedThread(filename, 384);
  const cappedLimit = await limitOf(capped);
  await capped.terminate();
  const mainAfter = getHeapStatistics().heap_size_limit;
  const plain = new Worker(filename, { resourceLimits: { maxOldGenerationSizeMb: 384 } });
  const plainLimit = await limitOf(plain);
  await plain.terminate();
  process.stdout.write(`${JSON.stringify({ mainBefore, mainAfter, cappedLimit, plainLimit })}\n`);
};

void main().then(
  () => process.exit(0),
  (error: unknown) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
);
