/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  CHECKPOINT_WAIT_TIMEOUT,
  ERROR_RETRY_MAX_DELAY_MS,
  MISSING_INDEX_RETRY_DELAY_MS,
  NUDGE_CREATE_TIMEOUT_MS,
  NUDGE_WRITE_TIMEOUT_MS,
  REQUEST_TIMEOUT_MS,
  TaskManagerClaimNudgeService,
} from './claim_nudge_service';

// lodash binds `Math.random` at load, so mock `random`; `max` lands on the backoff ceiling.
const mockRandom = jest.fn((max: number) => max);
jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  random: (max: number) => mockRandom(max),
}));

const INDEX = '.kibana_task_manager_claim_nudge';

function createService({
  esClient,
  logger = loggingSystemMock.createLogger(),
  isServerless = false,
}: {
  esClient: ElasticsearchClient;
  logger?: ReturnType<typeof loggingSystemMock.createLogger>;
  isServerless?: boolean;
}) {
  return {
    service: new TaskManagerClaimNudgeService({
      logger,
      esClient,
      index: INDEX,
      isServerless,
    }),
    logger,
  };
}

// Defaults to an already-existing index, the steady state after the first boot.
function createEsClientMock() {
  return {
    index: jest.fn(),
    indices: {
      create: jest.fn().mockRejectedValue(createIndexAlreadyExistsError()),
    },
    fleet: {
      globalCheckpoints: jest.fn(),
    },
  } as unknown as ElasticsearchClient;
}

function createIndexAlreadyExistsError() {
  return Object.assign(new Error('index already exists'), {
    body: { error: { type: 'resource_already_exists_exception' } },
  });
}

describe('TaskManagerClaimNudgeService', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    jest.restoreAllMocks();
    mockRandom.mockImplementation((max: number) => max);
  });

  describe('notify()', () => {
    it('writes the claim nudge doc to a fixed id without forcing a refresh', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      await service.notify();

      expect(esClient.index).toHaveBeenCalledWith(
        {
          index: INDEX,
          id: 'global',
          document: {
            updated_at: expect.any(String),
            nonce: expect.any(String),
          },
        },
        expect.any(Object)
      );
    });

    it('allows cold index creation while bounding steady-state writes and disabling retries', async () => {
      const esClient = createEsClientMock();
      (esClient.indices.create as jest.Mock).mockResolvedValue(undefined);
      const { service } = createService({ esClient });

      await service.notify();

      expect(esClient.indices.create).toHaveBeenCalledWith(expect.any(Object), {
        signal: expect.any(AbortSignal),
        requestTimeout: NUDGE_CREATE_TIMEOUT_MS,
        maxRetries: 0,
      });
      expect(esClient.index).toHaveBeenCalledWith(expect.any(Object), {
        signal: expect.any(AbortSignal),
        requestTimeout: NUDGE_WRITE_TIMEOUT_MS,
        maxRetries: 0,
      });

      expect(NUDGE_WRITE_TIMEOUT_MS).toBeLessThanOrEqual(1_000);
      expect(NUDGE_CREATE_TIMEOUT_MS).toBe(60_000);
    });

    it('coalesces notifications during creation but sends later updates separately', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });
      let finishCreation = () => {};
      let finishFirstWrite = () => {};
      (esClient.indices.create as jest.Mock).mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finishCreation = resolve;
          })
      );
      (esClient.index as jest.Mock).mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finishFirstWrite = resolve;
          })
      );
      const notifications = [service.notify(), service.notify(), service.notify()];
      expect(esClient.indices.create).toHaveBeenCalledTimes(1);
      expect(esClient.index).not.toHaveBeenCalled();
      finishCreation();
      await flushPromises();
      expect(esClient.index).toHaveBeenCalledTimes(1);
      // Arrives after the first write started, so it needs its own write.
      await service.notify();
      expect(esClient.index).toHaveBeenCalledTimes(2);
      finishFirstWrite();
      await Promise.all(notifications);
      service.stop();
    });

    it('aborts cold creation on stop and never writes after it eventually resolves', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });
      let finishCreation = () => {};
      (esClient.indices.create as jest.Mock).mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            finishCreation = resolve;
          })
      );
      const notification = service.notify();
      const signal = (esClient.indices.create as jest.Mock).mock.calls[0][1].signal;
      service.stop();
      expect(signal.aborted).toBe(true);
      finishCreation();
      await notification;
      await service.notify();
      expect(esClient.index).not.toHaveBeenCalled();
      expect(esClient.indices.create).toHaveBeenCalledTimes(1);
    });

    it('aborts an outbound write on a UI-only node that never started a watcher', async () => {
      const esClient = createEsClientMock();
      const { service, logger } = createService({ esClient });
      (esClient.index as jest.Mock).mockImplementationOnce(
        (_params, { signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
          })
      );
      const notification = service.notify();
      await flushPromises();
      expect(esClient.index).toHaveBeenCalledTimes(1);
      service.stop();
      await expect(notification).resolves.toBeUndefined();
      expect(logger.warn).not.toHaveBeenCalled();
      expect(esClient.fleet.globalCheckpoints).not.toHaveBeenCalled();
    });

    it('generates a new nonce on every call', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      await service.notify();
      await service.notify();

      const [{ document: firstDocument }] = (esClient.index as jest.Mock).mock.calls[0];
      const [{ document: secondDocument }] = (esClient.index as jest.Mock).mock.calls[1];
      expect(firstDocument.nonce).not.toEqual(secondDocument.nonce);
    });

    it('creates the signal index with mappings and single-shard settings', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      await service.notify();

      expect(esClient.indices.create).toHaveBeenCalledWith(
        {
          index: INDEX,
          mappings: {
            dynamic: false,
            properties: {
              updated_at: { type: 'date' },
              nonce: { type: 'keyword', ignore_above: 1024 },
            },
          },
          settings: { number_of_shards: 1, auto_expand_replicas: '0-1' },
        },
        expect.any(Object)
      );
    });

    it('omits shard settings on serverless, where Elasticsearch rejects them', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient, isServerless: true });

      await service.notify();

      expect(esClient.indices.create).toHaveBeenCalledWith(
        {
          index: INDEX,
          mappings: expect.any(Object),
        },
        expect.any(Object)
      );
    });

    it('only attempts to create the index once', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      await service.notify();
      await service.notify();

      expect(esClient.indices.create).toHaveBeenCalledTimes(1);
      expect(esClient.index).toHaveBeenCalledTimes(2);
    });

    it('tolerates the index being created concurrently by another Kibana node', async () => {
      const esClient = createEsClientMock();
      (esClient.indices.create as jest.Mock).mockRejectedValue(createIndexAlreadyExistsError());
      const { service } = createService({ esClient });

      await expect(service.notify()).resolves.toBeUndefined();
      expect(esClient.index).toHaveBeenCalledTimes(1);
    });

    it('drops the nudge when index creation fails, rather than letting the write auto-create', async () => {
      const esClient = createEsClientMock();
      (esClient.indices.create as jest.Mock)
        .mockRejectedValueOnce(new Error('ES unavailable'))
        .mockResolvedValueOnce(undefined);
      const { service, logger } = createService({ esClient });

      await expect(Promise.all([service.notify(), service.notify()])).resolves.toEqual([
        undefined,
        undefined,
      ]);
      expect(esClient.index).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ES unavailable'));

      await service.notify();

      expect(esClient.indices.create).toHaveBeenCalledTimes(2);
      expect(esClient.index).toHaveBeenCalledTimes(1);
    });
  });

  describe('start() / claimNudge$', () => {
    it('emits a claim nudge when checkpoints advance', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      let calls = 0;
      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(async () => {
        calls += 1;
        if (calls === 1) {
          return { global_checkpoints: [1], timed_out: false };
        }

        if (calls > 2) {
          service.stop();
        }
        return { global_checkpoints: [2], timed_out: false };
      });

      const nudgeSpy = jest.fn();
      service.claimNudge$.subscribe(nudgeSpy);

      service.start();
      await flushPromises();

      expect(nudgeSpy).toHaveBeenCalledTimes(1);
    });

    it('ignores a late checkpoint response after stop even if the transport does not reject', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });
      let finishRequest = () => {};
      (esClient.fleet.globalCheckpoints as jest.Mock)
        .mockResolvedValueOnce({ global_checkpoints: [1], timed_out: false })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              finishRequest = () => resolve({ global_checkpoints: [2], timed_out: false });
            })
        );
      const onNudge = jest.fn();
      service.claimNudge$.subscribe(onNudge);
      service.start();
      await flushPromises();
      service.stop();
      finishRequest();
      await flushPromises();
      expect(onNudge).not.toHaveBeenCalled();
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(2);
    });

    it('does not emit on the first (baseline-establishing) response', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(async () => {
        service.stop();
        return { global_checkpoints: [1], timed_out: false };
      });

      const nudgeSpy = jest.fn();
      service.claimNudge$.subscribe(nudgeSpy);

      service.start();
      await flushPromises();

      expect(nudgeSpy).not.toHaveBeenCalled();
    });

    it('does not emit when the long-poll times out without advancing', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      let calls = 0;
      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(async () => {
        calls += 1;
        if (calls === 1) {
          return { global_checkpoints: [1], timed_out: false };
        }

        service.stop();
        // Advanced checkpoints, so only `timed_out` can suppress the nudge here.
        return { global_checkpoints: [2], timed_out: true };
      });

      const nudgeSpy = jest.fn();
      service.claimNudge$.subscribe(nudgeSpy);

      service.start();
      await flushPromises();

      expect(nudgeSpy).not.toHaveBeenCalled();
    });

    it('calls fleet.globalCheckpoints with the configured index and wait_for_advance', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(async () => {
        service.stop();
        return { global_checkpoints: [1], timed_out: false };
      });

      service.start();
      await flushPromises();

      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledWith(
        expect.objectContaining({
          index: INDEX,
          wait_for_advance: true,
          wait_for_index: true,
          checkpoints: [],
          timeout: CHECKPOINT_WAIT_TIMEOUT,
        }),
        expect.objectContaining({
          retryOnTimeout: false,
          maxRetries: 0,
          requestTimeout: REQUEST_TIMEOUT_MS,
        })
      );
    });

    it('feeds each response’s checkpoints into the next request, including after a timeout', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      let calls = 0;
      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(async () => {
        calls += 1;
        if (calls === 1) {
          return { global_checkpoints: [1], timed_out: false };
        }
        if (calls === 2) {
          // Adopt timed-out checkpoints too, or a recreated index would leave the watcher stuck.
          return { global_checkpoints: [7], timed_out: true };
        }

        service.stop();
        return { global_checkpoints: [9], timed_out: false };
      });

      service.start();
      await flushPromises();

      const requests = (esClient.fleet.globalCheckpoints as jest.Mock).mock.calls;
      // Always sending `[]` would make `wait_for_advance` return immediately and spin the loop.
      expect(requests[0][0].checkpoints).toEqual([]);
      expect(requests[1][0].checkpoints).toEqual([1]);
      expect(requests[2][0].checkpoints).toEqual([7]);
    });

    it('does not create the signal index; wait_for_index lets it watch one that does not exist yet', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(async () => {
        service.stop();
        return { global_checkpoints: [1], timed_out: false };
      });

      service.start();
      await flushPromises();

      expect(esClient.indices.create).not.toHaveBeenCalled();
    });

    it('is a no-op when called while already started', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(async () => {
        // Yield so the second `start()` below runs while still started and hits the no-op guard.
        await Promise.resolve();
        service.stop();
        return { global_checkpoints: [1], timed_out: false };
      });

      service.start();
      service.start();
      await flushPromises();

      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(1);
    });

    it('quietly retries missing-index waits at a bounded rate until a sender creates it', async () => {
      jest.useFakeTimers();
      const esClient = createEsClientMock();
      const { service, logger } = createService({ esClient });
      const missingIndex = Object.assign(new Error('missing index'), {
        body: { error: { type: 'index_not_found_exception' } },
      });
      (esClient.fleet.globalCheckpoints as jest.Mock)
        .mockRejectedValueOnce(missingIndex)
        .mockRejectedValueOnce(missingIndex)
        .mockRejectedValueOnce(missingIndex)
        .mockResolvedValueOnce({ global_checkpoints: [1], timed_out: false })
        .mockResolvedValueOnce({ global_checkpoints: [2], timed_out: false })
        .mockImplementation(() => new Promise(() => {}));
      const onNudge = jest.fn();
      service.claimNudge$.subscribe(onNudge);
      service.start();
      await jest.advanceTimersByTimeAsync(0);
      for (let attempt = 1; attempt <= 3; attempt++) {
        expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(attempt);
        await jest.advanceTimersByTimeAsync(MISSING_INDEX_RETRY_DELAY_MS - 1);
        expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(attempt);
        await jest.advanceTimersByTimeAsync(1);
      }
      expect(onNudge).toHaveBeenCalledTimes(1);
      expect(logger.warn).not.toHaveBeenCalled();
      expect(logger.debug).toHaveBeenCalledWith(
        `Task Manager claim nudge index ${INDEX} does not exist yet; retrying in ${MISSING_INDEX_RETRY_DELAY_MS}ms`
      );
      expect(esClient.indices.create).not.toHaveBeenCalled();
      service.stop();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('cancels the missing-index retry delay on stop', async () => {
      jest.useFakeTimers();
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });
      (esClient.fleet.globalCheckpoints as jest.Mock).mockRejectedValue({
        body: { error: { type: 'index_not_found_exception' } },
      });
      service.start();
      await jest.advanceTimersByTimeAsync(0);
      service.stop();
      await jest.advanceTimersByTimeAsync(60_000);
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('retries after a backoff when the request throws, and recovers', async () => {
      jest.useFakeTimers();

      const esClient = createEsClientMock();
      const { service, logger } = createService({ esClient });

      let calls = 0;
      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(async () => {
        calls += 1;
        if (calls === 1) {
          throw new Error('ES temporarily unavailable');
        }
        service.stop();
        return { global_checkpoints: [1], timed_out: false };
      });

      const nudgeSpy = jest.fn();
      service.claimNudge$.subscribe(nudgeSpy);

      service.start();
      await jest.advanceTimersByTimeAsync(0);
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('ES temporarily unavailable')
      );

      // First failure backs off by the base delay (1s ceiling).
      await jest.advanceTimersByTimeAsync(1_000);

      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(2);
    });

    it('retries rather than permanently stopping when an unrelated error message mentions "aborted"', async () => {
      jest.useFakeTimers();

      const esClient = createEsClientMock();
      const { service, logger } = createService({ esClient });

      let calls = 0;
      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(async () => {
        calls += 1;
        if (calls === 1) {
          // Must not be mistaken for a stop(): that would end the loop while `started` stays true.
          throw new Error('socket hang up: request aborted');
        }
        service.stop();
        return { global_checkpoints: [1], timed_out: false };
      });

      service.start();
      await jest.advanceTimersByTimeAsync(0);
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('request aborted'));

      await jest.advanceTimersByTimeAsync(1_000);

      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(2);
    });

    it('grows the retry backoff ceiling exponentially on consecutive failures, capped at 60s', async () => {
      jest.useFakeTimers();

      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      const totalFailuresBeforeStop = 8; // enough to reach and exceed the 60s cap
      let calls = 0;
      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(async () => {
        calls += 1;
        if (calls > totalFailuresBeforeStop) {
          service.stop();
          return { global_checkpoints: [1], timed_out: false };
        }
        throw new Error('ES temporarily unavailable');
      });

      service.start();
      await jest.advanceTimersByTimeAsync(0);
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(1);

      const expectedCeilingsMs = [1_000, 2_000, 4_000, 8_000, 16_000, 32_000, 60_000, 60_000];
      for (const [index, ceilingMs] of expectedCeilingsMs.entries()) {
        const callsBefore = index + 1;
        await jest.advanceTimersByTimeAsync(ceilingMs - 1);
        expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(callsBefore);

        await jest.advanceTimersByTimeAsync(1);
        expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(callsBefore + 1);
      }
    });

    it('never retries sooner than half the ceiling, even when the jitter rolls its minimum', async () => {
      jest.useFakeTimers();
      mockRandom.mockImplementation(() => 0);

      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      let calls = 0;
      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(async () => {
        calls += 1;
        if (calls === 1) {
          throw new Error('ES temporarily unavailable');
        }
        service.stop();
        return { global_checkpoints: [1], timed_out: false };
      });

      service.start();
      await jest.advanceTimersByTimeAsync(0);
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(1);

      // With zero jitter, the guaranteed half of the 1s ceiling must still elapse.
      await jest.advanceTimersByTimeAsync(499);
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1);
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(2);
    });

    it('resets the retry backoff ceiling after a successful poll', async () => {
      jest.useFakeTimers();

      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      const script: Array<'fail' | 'succeed' | 'stop'> = [
        'fail',
        'fail',
        'succeed',
        'fail',
        'stop',
      ];
      let call = 0;
      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(async () => {
        const step = script[call];
        call += 1;
        if (step === 'fail') {
          throw new Error('ES temporarily unavailable');
        }
        if (step === 'stop') {
          service.stop();
        }
        return { global_checkpoints: [1], timed_out: false };
      });

      service.start();

      await jest.advanceTimersByTimeAsync(0); // 1st failure
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(1);

      await jest.advanceTimersByTimeAsync(1_000); // ceiling after the 1st failure
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(2); // 2nd failure

      // Also resolves the success that follows (no backoff) and the failure after it.
      await jest.advanceTimersByTimeAsync(2_000); // ceiling after the 2nd failure
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(4); // success, then 1st failure since reset

      // If the ceiling had kept growing instead of resetting, this would need 4_000ms, not 1_000ms.
      await jest.advanceTimersByTimeAsync(999);
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(4);
      await jest.advanceTimersByTimeAsync(1);
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(5);
    });

    it('cancels a pending retry delay on stop(), leaving no timer behind', async () => {
      jest.useFakeTimers();

      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      (esClient.fleet.globalCheckpoints as jest.Mock).mockRejectedValue(
        new Error('ES temporarily unavailable')
      );

      service.start();
      await jest.advanceTimersByTimeAsync(0);
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(1);

      service.stop();
      await jest.advanceTimersByTimeAsync(0);

      expect(jest.getTimerCount()).toBe(0);

      await jest.advanceTimersByTimeAsync(ERROR_RETRY_MAX_DELAY_MS);
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(1);
    });

    it('does not resume the old loop when start() is called during a retry delay', async () => {
      jest.useFakeTimers();

      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      (esClient.fleet.globalCheckpoints as jest.Mock)
        .mockRejectedValueOnce(new Error('ES temporarily unavailable'))
        .mockImplementation(
          () =>
            new Promise(() => {
              /* never resolves; simulates an in-flight long-poll */
            })
        );

      service.start();
      await jest.advanceTimersByTimeAsync(0);
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(1);

      service.stop();
      service.start();
      await jest.advanceTimersByTimeAsync(0);
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(2);

      await jest.advanceTimersByTimeAsync(ERROR_RETRY_MAX_DELAY_MS);
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(2);

      service.stop();
    });

    it('can be started again after stop() aborts the in-flight request', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(
        async (_params, options: { signal: AbortSignal }) => {
          return new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => {
              const err = new Error('aborted');
              err.name = 'AbortError';
              reject(err);
            });
          });
        }
      );

      service.start();
      await flushPromises();
      service.stop();
      await flushPromises();

      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(1);

      service.start();
      await flushPromises();

      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(2);
    });

    it('stops cleanly and aborts the in-flight request', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      let capturedSignal: AbortSignal | undefined;
      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(
        async (_params, options) => {
          capturedSignal = options?.signal;
          return new Promise(() => {
            /* never resolves; simulates an in-flight long-poll */
          });
        }
      );

      service.start();
      await flushPromises();

      expect(capturedSignal?.aborted).toBe(false);
      service.stop();
      expect(capturedSignal?.aborted).toBe(true);
    });

    it('treats the abort from stop() as a clean exit rather than a failure to retry', async () => {
      const esClient = createEsClientMock();
      const { service, logger } = createService({ esClient });

      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(
        async (_params, options: { signal: AbortSignal }) => {
          return new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => {
              const err = new Error('aborted');
              err.name = 'AbortError';
              reject(err);
            });
          });
        }
      );

      service.start();
      await flushPromises();
      service.stop();
      await flushPromises();

      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(1);
      // Several guards stop the loop; only the catch's early return keeps the abort out of backoff.
      expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('stopped.'));
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });
});

function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}
