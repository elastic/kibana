/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Minimal CPU-bound worker module used by `worker_pool_service.test.ts` (end-to-end,
 * real worker thread) to prove `WorkerPoolService` actually dispatches to a Piscina
 * worker rather than just exercising a mock. Deliberately has no dependency on any
 * Kibana service - workers get none.
 */
function isPrime(candidate: number): boolean {
  if (candidate < 2) {
    return false;
  }
  for (let divisor = 2; divisor * divisor <= candidate; divisor++) {
    if (candidate % divisor === 0) {
      return false;
    }
  }
  return true;
}

interface IsPrimeInput {
  candidate: number;
}

interface IsPrimeResult {
  candidate: number;
  isPrime: boolean;
  // Confirms the function actually ran off the main thread's event loop.
  ranInWorkerThread: boolean;
}

// eslint-disable-next-line import/no-default-export
export default function ({ candidate }: IsPrimeInput): IsPrimeResult {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { isMainThread } = require('worker_threads');
  return { candidate, isPrime: isPrime(candidate), ranInWorkerThread: !isMainThread };
}
