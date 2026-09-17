/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { WorkerPoolService } from '../worker_pool_service';
import { WorkerPoolAtCapacityError } from '../errors';
import type { WorkerThreadsConfig } from '../../config';

/**
 * End-to-end test of `WorkerPoolService` against a *real* Piscina pool and a real worker
 * thread (`task_worker_wrapper.js` -> `task_worker.ts` -> the fixture module below), unlike
 * `worker_pool_service.test.ts` which mocks `piscina` to unit test the ledger/error-mapping
 * logic in isolation. Lives under `integration_tests/` because it spawns actual OS threads.
 */
describe('WorkerPoolService (real worker thread)', () => {
  const logger = loggingSystemMock.createLogger();
  const config: WorkerThreadsConfig = {
    enabled: true,
    max_threads: 2,
    max_total_memory_mb: 100,
    max_task_heap_mb: 50,
    idle_timeout: moment.duration(1, 'second'),
  };

  let service: WorkerPoolService;

  afterEach(async () => {
    await service?.stop();
  });

  it('executes a worker module in a real worker thread and returns its result', async () => {
    service = new WorkerPoolService(config, logger);
    service.start();

    const result = await service.run(
      require.resolve('./fixtures/is_prime_worker'),
      {
        candidate: 97,
      },
      { memoryMb: 10 }
    );

    expect(result).toEqual({ candidate: 97, isPrime: true, ranInWorkerThread: true });
  });

  it('runs concurrent tasks without exceeding the declared memory budget', async () => {
    service = new WorkerPoolService(config, logger);
    service.start();

    const [a, b] = await Promise.all([
      service.run(
        require.resolve('./fixtures/is_prime_worker'),
        { candidate: 17 },
        {
          memoryMb: 40,
        }
      ),
      service.run(
        require.resolve('./fixtures/is_prime_worker'),
        { candidate: 18 },
        {
          memoryMb: 40,
        }
      ),
    ]);

    expect(a).toEqual({ candidate: 17, isPrime: true, ranInWorkerThread: true });
    expect(b).toEqual({ candidate: 18, isPrime: false, ranInWorkerThread: true });
    // budget released once both settle
    expect(service.availableMemoryMb).toBe(100);
  });

  it('rejects immediately with WorkerPoolAtCapacityError when the memory budget is exceeded', async () => {
    service = new WorkerPoolService(config, logger);
    service.start();

    await expect(
      service.run(
        require.resolve('./fixtures/is_prime_worker'),
        { candidate: 2 },
        {
          memoryMb: 200,
        }
      )
    ).rejects.toThrow(WorkerPoolAtCapacityError);
  });

  it('aborts a run via the passed-in signal', async () => {
    service = new WorkerPoolService(config, logger);
    service.start();

    const controller = new AbortController();
    const runPromise = service.run(
      require.resolve('./fixtures/is_prime_worker'),
      { candidate: 2 },
      { memoryMb: 10, signal: controller.signal }
    );
    controller.abort();

    await expect(runPromise).rejects.toThrow();
    // the pool recreates itself after an aborted run and remains usable
    const result = await service.run(
      require.resolve('./fixtures/is_prime_worker'),
      {
        candidate: 3,
      },
      { memoryMb: 10 }
    );
    expect(result).toEqual({ candidate: 3, isPrime: true, ranInWorkerThread: true });
  });
});
