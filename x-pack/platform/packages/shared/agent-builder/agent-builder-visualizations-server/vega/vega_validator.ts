/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Worker } from 'node:worker_threads';
import type { Logger } from '@kbn/logging';
import workerPath from './vega_validator_wrapper.cjs';

export interface VegaValidationResult {
  error?: string;
  warnings: string[];
}

interface WorkerResponse {
  ok: boolean;
  error?: string;
  infraError?: string;
  warnings?: string[];
}

const VALIDATION_TIMEOUT_MS = 10_000;
const WORKER_MAX_OLD_GEN_MB = 128;
const MAX_CONCURRENT_VALIDATIONS = 2;

let activeValidationCount = 0;

/**
 * Compile and headless-render a Vega-Lite spec in an isolated worker. Spec
 * errors are returned to the authoring graph; infrastructure failures fail open
 * so validation cannot block visualization generation.
 */
export const validateVegaSpec = async ({
  spec,
  logger,
}: {
  spec: Record<string, unknown>;
  logger: Logger;
}): Promise<VegaValidationResult> => {
  if (activeValidationCount >= MAX_CONCURRENT_VALIDATIONS) {
    logger.warn(
      `Vega validator is at capacity (${MAX_CONCURRENT_VALIDATIONS}); skipping validation`
    );
    return { warnings: [] };
  }

  activeValidationCount += 1;
  let worker: Worker | undefined;

  try {
    let activeWorker: Worker;
    try {
      activeWorker = new Worker(workerPath, {
        resourceLimits: { maxOldGenerationSizeMb: WORKER_MAX_OLD_GEN_MB },
      });
      worker = activeWorker;
    } catch (error) {
      logger.warn(
        `Could not start Vega validator worker: ${error instanceof Error ? error.message : error}`
      );
      return { warnings: [] };
    }

    return await new Promise<VegaValidationResult>((resolve) => {
      let settled = false;
      const settle = (result: VegaValidationResult) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(result);
      };

      const timer = setTimeout(() => {
        logger.warn('Vega validation timed out; skipping');
        settle({ warnings: [] });
      }, VALIDATION_TIMEOUT_MS);

      activeWorker.on('message', (response: WorkerResponse) => {
        if (response.infraError) {
          logger.warn(`Vega validator could not load the Vega libraries: ${response.infraError}`);
          settle({ warnings: [] });
          return;
        }

        settle({
          error: response.ok ? undefined : response.error,
          warnings: response.warnings ?? [],
        });
      });

      activeWorker.on('error', (error) => {
        logger.warn(`Vega validator worker error: ${error.message}`);
        settle({ warnings: [] });
      });

      activeWorker.on('exit', (code) => {
        if (settled) {
          return;
        }
        logger.warn(`Vega validator worker exited before responding (code ${code})`);
        settle({ warnings: [] });
      });

      try {
        activeWorker.postMessage({ spec });
      } catch (error) {
        logger.warn(
          `Could not send Vega spec to validator worker: ${
            error instanceof Error ? error.message : error
          }`
        );
        settle({ warnings: [] });
      }
    });
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (error) {
        logger.warn(
          `Could not terminate Vega validator worker: ${
            error instanceof Error ? error.message : error
          }`
        );
      }
    }
    activeValidationCount -= 1;
  }
};
