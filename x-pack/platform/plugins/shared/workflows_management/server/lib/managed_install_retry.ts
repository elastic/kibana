/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetryDelayConfig } from '@kbn/workflows';

/** Retries of a startup managed install that failed on a transient Elasticsearch error. */
export const MANAGED_INSTALL_MAX_RETRIES = 4;

/**
 * Backoff of those retries: 1 s, 2 s, 4 s and 8 s, each with jitter so the Kibana nodes of a
 * deployment that hit the same Elasticsearch blip do not retry in lockstep. About 15 s in all;
 * longer outages wait in the readiness gate that each retry passes through again.
 */
export const MANAGED_INSTALL_RETRY_DELAY: RetryDelayConfig = {
  strategy: 'exponential',
  delay: '1s',
  multiplier: 2,
  'max-delay': '8s',
  jitter: true,
};

/** Resolves after `delayMs`, or as soon as `signal` aborts. */
export const waitUnlessAborted = (delayMs: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const onAbort = () => {
      clearTimeout(timeout);
      resolve();
    };
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    signal.addEventListener('abort', onAbort, { once: true });
  });
