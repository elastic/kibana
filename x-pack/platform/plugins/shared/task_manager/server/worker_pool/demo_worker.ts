/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkerTaskInput, WorkerRunResult } from '../task';

/**
 * Worker module for `task_manager:worker_process_demo` (see `demo_task.ts`). Deliberately
 * CPU-bound and has no dependency on any Kibana service - workers get none. Recomputes prime
 * counts up to an ever-increasing limit on every run so `state` visibly changes each time the
 * task runs, making it easy to confirm the task is really executing in its own process.
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

function countPrimesBelow(limit: number): number {
  let count = 0;
  for (let candidate = 2; candidate < limit; candidate++) {
    if (isPrime(candidate)) {
      count++;
    }
  }
  return count;
}

// eslint-disable-next-line import/no-default-export
export default function demoWorker({ taskInstance }: WorkerTaskInput): WorkerRunResult {
  const runCount = (Number(taskInstance.state.runCount) || 0) + 1;
  const limit = 10_000 + runCount * 1_000;
  const primeCount = countPrimesBelow(limit);

  return {
    state: {
      runCount,
      limit,
      primeCount,
      // This module only ever executes inside a dispatched worker-process child (see
      // `task_runner.ts`'s `createWorkerTask`), so simply reaching here already proves it ran
      // off the main Kibana process; `workerProcessPid` proves it's a fresh process each run.
      ranInWorkerProcess: true,
      workerProcessPid: process.pid,
      lastRunAt: new Date().toISOString(),
    },
  };
}
