/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'crypto';
import { resolve } from 'path';
import { Worker } from 'worker_threads';

import { executeResearchEsoProbe } from './research_eso_probe';

jest.setTimeout(20000);

interface WorkerResult {
  ok: boolean;
  checks: readonly string[];
  heapUsed: number;
  threadId: number;
  stage?: string;
}

it('exercises actual crypto, AAD/partial merge, extension stripping and key rotation', async () => {
  const result = await executeResearchEsoProbe({
    primaryKey: randomBytes(32).toString('hex'),
    rotatedKey: randomBytes(32).toString('hex'),
  });
  expect(result.checks).toHaveLength(11);
  expect(result.checks).toContain('safe_partial_update');
  expect(result.checks).toContain('aad_tamper_rejected');
  expect(result.checks).toContain('decryption_only_rotation');
});

it('reconstructs the real private ESO kernel in a worker from memory-only key configuration', async () => {
  const keys = {
    primaryKey: randomBytes(32).toString('hex'),
    rotatedKey: randomBytes(32).toString('hex'),
  };
  const main = await executeResearchEsoProbe(keys);
  const worker = new Worker(
    resolve(
      __dirname,
      '../../../private/workload_isolation_research/prototypes/task_capsule/research_eso_entry.cts'
    ),
    { workerData: { module: 'eso_capability_probe_v1', ...keys } }
  );
  try {
    const result = await new Promise<WorkerResult>((resolveResult, reject) => {
      const timer = setTimeout(() => reject(new Error('Research ESO worker deadline')), 15000);
      worker.once('message', (message: WorkerResult) => {
        clearTimeout(timer);
        resolveResult(message);
      });
      worker.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
      worker.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`Research ESO worker exited without result: ${code}`));
      });
    });
    if (!result.ok) throw new Error(`Research ESO worker check failed: ${result.stage}`);
    expect(result.checks).toEqual(main.checks);
    expect(result.threadId).toBeGreaterThan(0);
    expect(result.heapUsed).toBeGreaterThan(0);
  } finally {
    await worker.terminate();
  }
});
