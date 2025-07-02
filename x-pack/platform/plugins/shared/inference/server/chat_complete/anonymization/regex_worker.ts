/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Piscina from 'piscina';
import { RegexAnonymizationTask } from '@kbn/inference-common';
import { regexWorkerFilename } from './regex_worker_task';

let worker: Piscina | undefined;

export function initRegexWorker() {
  if (worker) return;
  worker = new Piscina({
    filename: require.resolve('./regex_worker_wrapper.js'),
    workerData: { fullpath: regexWorkerFilename },
    minThreads: 0,
    maxThreads: 3,
    idleTimeout: 30000,
  });
}

export async function destroyRegexWorker(): Promise<void> {
  if (!worker) return;
  await worker.destroy();
  worker = undefined;
}

const REGEX_TTL_MS = 1500;

export async function runRegexTask(payload: RegexAnonymizationTask, ttl?: number) {
  if (!worker) throw new Error('Regex worker not initialised');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ttl ?? REGEX_TTL_MS);

  try {
    return await worker.run(payload, { signal: controller.signal });
  } catch (err) {
    if (err?.name === 'AbortError') {
      if (worker.threads.length > 0) {
        // Attempt to terminate stuck threads
        await Promise.all(
          worker.threads.map(async (thread) => {
            try {
              await thread.terminate();
            } catch (e) {
              // Ignore termination errors
            }
          })
        );
      }
      throw new Error('Regex anonymization timed out');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
