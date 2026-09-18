/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { WorkerPoolService } from '../worker_pool_service';
import { WorkerPoolAtCapacityError, WorkerMemoryBudgetExceededError } from '../errors';
import { CgroupEnforcer } from '../cgroup_enforcer';
import type { WorkerProcessesConfig } from '../../config';

/**
 * End-to-end tests of `WorkerPoolService` against *real* forked child processes (unlike
 * `worker_pool_service.test.ts`, which mocks `child_process.fork` and `CgroupEnforcer` to
 * unit test the ledger/error-mapping logic in isolation). Lives under `integration_tests/`
 * because it spawns actual OS processes.
 */
describe('WorkerPoolService (real child processes)', () => {
  const logger = loggingSystemMock.createLogger();
  const config: WorkerProcessesConfig = {
    enabled: true,
    max_processes: 2,
    max_total_memory_mb: 200,
    baseline_memory_mb: 40,
    enforcement: 'best_effort',
    max_cpu_percent: undefined,
    idle_timeout: moment.duration(1, 'second'),
  };

  let service: WorkerPoolService;

  afterEach(async () => {
    await service?.stop();
  });

  it('executes a worker module in a real child process and returns its result', async () => {
    service = new WorkerPoolService(config, logger);
    service.start();

    const result = await service.run(
      require.resolve('./fixtures/is_prime_worker'),
      {
        candidate: 97,
      },
      { memoryMb: 10 }
    );

    expect(result).toMatchObject({ candidate: 97, isPrime: true, ranInWorkerProcess: true });
  });

  it('runs concurrent tasks in distinct processes without exceeding the declared memory budget', async () => {
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

    expect(a).toMatchObject({ candidate: 17, isPrime: true });
    expect(b).toMatchObject({ candidate: 18, isPrime: false });
    // distinct OS processes
    expect((a as { pid: number }).pid).not.toEqual((b as { pid: number }).pid);
    // budget released once both settle
    expect(service.availableMemoryMb).toBe(200);
  });

  it('rejects immediately with WorkerPoolAtCapacityError when the memory budget is exceeded', async () => {
    service = new WorkerPoolService(config, logger);
    service.start();

    await expect(
      service.run(
        require.resolve('./fixtures/is_prime_worker'),
        { candidate: 2 },
        {
          memoryMb: 300,
        }
      )
    ).rejects.toThrow(WorkerPoolAtCapacityError);
  });

  it('aborts a run via the passed-in signal by killing the child process', async () => {
    service = new WorkerPoolService(config, logger);
    service.start();

    const controller = new AbortController();
    const runPromise = service.run(
      require.resolve('./fixtures/is_prime_worker'),
      { candidate: 2 },
      { memoryMb: 10, signal: controller.signal }
    );
    controller.abort();

    await expect(runPromise).rejects.toMatchObject({ name: 'AbortError' });

    // a fresh process is forked for the next run and the pool remains usable
    const result = await service.run(
      require.resolve('./fixtures/is_prime_worker'),
      {
        candidate: 3,
      },
      { memoryMb: 10 }
    );
    expect(result).toMatchObject({ candidate: 3, isPrime: true });
  });

  it('rejects when a worker module exceeds the portable V8 heap cap (no cgroups required)', async () => {
    service = new WorkerPoolService(config, logger);
    service.start();

    // memoryMb(1) + baseline(40) = 41MB heap cap; growing the JS heap with millions of
    // small objects well past that crashes the child with a V8 "out of memory" fatal error
    // before it can finish.
    await expect(
      service.run(
        require.resolve('./fixtures/heap_hog_worker'),
        { iterations: 5_000_000 },
        { memoryMb: 1 }
      )
    ).rejects.toThrow(/exited unexpectedly|killed/);
  }, 30000);

  // Only meaningful, and only run, where the kernel can actually enforce the limit: Linux
  // with cgroups v2 and a writable, delegated subtree (true in CI containers with a
  // writable cgroup mount; false on macOS dev machines and many sandboxed environments).
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const cgroupProbe = new CgroupEnforcer(loggingSystemMock.createLogger());
  cgroupProbe.setup();
  const describeIfCgroupsAvailable = cgroupProbe.capability.supported ? describe : describe.skip;

  describeIfCgroupsAvailable('with kernel-enforced cgroup memory limits', () => {
    it('kernel-OOM-kills a Buffer-hog that a V8 heap cap alone could not catch', async () => {
      service = new WorkerPoolService(config, logger);
      service.start();

      // A large heap cap (declared memoryMb + baseline) so the V8 heap-cap layer would
      // *not* catch this on its own - only the cgroup's memory.max (RSS-based) can, since
      // Buffer memory is off-heap.
      await expect(
        service.run(
          require.resolve('./fixtures/buffer_hog_worker'),
          { chunkMb: 20, iterations: 50 }, // 1000MB total, far past the budget below
          { memoryMb: 20 } // + baseline_memory_mb(40) = 60MB hard cap
        )
      ).rejects.toThrow(WorkerMemoryBudgetExceededError);
    }, 30000);
  });
});
