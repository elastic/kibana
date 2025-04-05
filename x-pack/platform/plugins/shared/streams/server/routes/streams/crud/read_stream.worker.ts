/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteWorker } from '@kbn/core-worker-threads-server';
import { isWorkerThread } from 'piscina';

const worker: RouteWorker<
  {},
  {
    isWorkerThread: boolean;
  }
> = {
  run: async ({ input, core, signal, logger }) => {
    logger.warn('Hi from a worker thread!');
    return {
      isWorkerThread,
    };
  },
};

export const run = worker.run;
