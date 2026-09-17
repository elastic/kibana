/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkerPoolService } from './worker_pool_service';

const createWorkerPoolServiceMock = (): jest.Mocked<WorkerPoolService> => {
  return {
    enabled: true,
    availableMemoryMb: 512,
    start: jest.fn(),
    hasCapacityFor: jest.fn().mockReturnValue(true),
    run: jest.fn(),
    stop: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<WorkerPoolService>;
};

export const workerPoolServiceMock = {
  create: createWorkerPoolServiceMock,
};
