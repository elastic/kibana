/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Worker } from 'node:worker_threads';
import type { Logger } from '@kbn/logging';

export interface VegaValidationResult {
  /** Set when Vega rejected the spec (a compile- or render-time error). */
  error?: string;
  /** Non-fatal warnings emitted while compiling/running the spec. */
  warnings: string[];
}

interface WorkerResponse {
  ok: boolean;
  /** Vega rejected the spec (compile- or render-time). */
  error?: string;
  /** In-worker infra fault (e.g. the ESM vega libs failed to load); fail open. */
  infraError?: string;
  warnings?: string[];
}

/**
 * Worker entrypoint (a CJS wrapper that bootstraps the Node env, then loads the
 * TS worker task); see `vega_validator_worker.ts` for why validation runs in a
 * worker. `require.resolve` yields a path correct in both dev (source) and the
 * built distributable.
 */
const WORKER_PATH = require.resolve('./vega_validator_wrapper.js');
const VALIDATION_TIMEOUT_MS = 10_000;
/**
 * Cap the worker's JS heap. A crafted spec (e.g. a huge `sequence` data
 * generator plus a `window` transform) can otherwise balloon to Node's
 * multi-GB default before the timeout fires — the timeout bounds CPU time, not
 * allocation. At 128 MB such a spec is killed fast and only the worker dies
 * (`exit`/`error` fail open), instead of letting aggregate RSS grow until the
 * OS OOM-killer takes the whole Kibana process.
 */
const WORKER_MAX_OLD_GEN_MB = 128;

/**
 * Compile a Vega-Lite spec to Vega and run it headless in a worker thread to
 * surface compile- and render-time errors (and warnings) before the spec is
 * stored. Returns `{ error }` when Vega rejects the spec; otherwise
 * `{ warnings }`. Infra failures or timeouts fail open (resolve with no error)
 * so they never block generation.
 *
 * A fresh worker is spawned per call and always terminated afterwards, so the
 * timeout genuinely cancels runaway compile/render work (vega runs synchronous
 * CPU-bound code a shared worker could never abandon).
 */
export const validateVegaSpec = async ({
  spec,
  logger,
}: {
  spec: Record<string, unknown>;
  logger: Logger;
}): Promise<VegaValidationResult> => {
  let worker: Worker;
  try {
    worker = new Worker(WORKER_PATH, {
      resourceLimits: { maxOldGenerationSizeMb: WORKER_MAX_OLD_GEN_MB },
    });
  } catch (error) {
    logger.warn(
      `Could not start Vega validator worker: ${error instanceof Error ? error.message : error}`
    );
    return { warnings: [] };
  }

  try {
    return await new Promise<VegaValidationResult>((resolve) => {
      const timer = setTimeout(() => {
        logger.warn('Vega validation timed out; skipping');
        resolve({ warnings: [] });
      }, VALIDATION_TIMEOUT_MS);

      worker.on('message', (response: WorkerResponse) => {
        clearTimeout(timer);
        // An in-worker infra fault (not a spec rejection) fails open, like
        // every other infra failure: it must not be fed back to the model.
        if (response.infraError) {
          logger.warn(`Vega validator could not load the vega libs: ${response.infraError}`);
          resolve({ warnings: [] });
          return;
        }
        resolve({
          error: response.ok ? undefined : response.error,
          warnings: response.warnings ?? [],
        });
      });
      // Infra failures (worker crash/exit) must not block spec generation:
      // fail open by resolving with "no error, no warnings".
      worker.on('error', (error) => {
        clearTimeout(timer);
        logger.warn(`Vega validator worker error: ${error.message}`);
        resolve({ warnings: [] });
      });
      worker.on('exit', () => {
        clearTimeout(timer);
        resolve({ warnings: [] });
      });

      worker.postMessage({ spec });
    });
  } finally {
    void worker.terminate();
  }
};
