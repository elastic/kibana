/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { TaskManagerClaimNudgeService } from './claim_nudge_service';

// `lodash.random` binds `Math.random` at load time, so spying on the global doesn't work.
// Mock it directly; defaults to returning its input so backoff tests land exactly on the
// ceiling, but `mockRandom` can be overridden per-test (e.g. to hit the guaranteed floor).
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

/**
 * Defaults to an index that already exists, which is the steady state on every Kibana boot after
 * the first. Tests covering a freshly created index let `indices.create` succeed instead.
 */
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

      expect(esClient.index).toHaveBeenCalledWith({
        index: INDEX,
        id: 'global',
        document: {
          updated_at: expect.any(String),
          nonce: expect.any(String),
        },
      });
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

      expect(esClient.indices.create).toHaveBeenCalledWith({
        index: INDEX,
        mappings: {
          dynamic: false,
          properties: {
            updated_at: { type: 'date' },
            nonce: { type: 'keyword', ignore_above: 1024 },
          },
        },
        settings: { number_of_shards: 1, auto_expand_replicas: '0-1' },
      });
    });

    it('omits shard settings on serverless, where Elasticsearch rejects them', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient, isServerless: true });

      await service.notify();

      expect(esClient.indices.create).toHaveBeenCalledWith({
        index: INDEX,
        mappings: expect.any(Object),
      });
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

    it('surfaces index creation failures and retries them on the next call', async () => {
      const esClient = createEsClientMock();
      (esClient.indices.create as jest.Mock)
        .mockRejectedValueOnce(new Error('ES unavailable'))
        .mockResolvedValueOnce(undefined);
      const { service } = createService({ esClient });

      await expect(service.notify()).rejects.toThrow('ES unavailable');
      expect(esClient.index).not.toHaveBeenCalled();

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

        service.stop();
        return { global_checkpoints: [2], timed_out: false };
      });

      const nudgeSpy = jest.fn();
      service.claimNudge$.subscribe(nudgeSpy);

      service.start();
      await flushPromises();

      expect(nudgeSpy).toHaveBeenCalledTimes(1);
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
        return { global_checkpoints: [1], timed_out: true };
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
        }),
        expect.objectContaining({ retryOnTimeout: false })
      );
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
        // Yield a microtask before stopping so the reentrant `start()` below sees
        // `started === true` and hits the no-op guard (a real ES call couldn't resolve this fast).
        await Promise.resolve();
        service.stop();
        return { global_checkpoints: [1], timed_out: false };
      });

      service.start();
      service.start();
      await flushPromises();

      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(1);
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
          // A transport failure that happens to mention "aborted" but wasn't caused by stop() —
          // must not be mistaken for one, which would silently end the loop while `started` stays true.
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

      // Ceiling after each consecutive failure: 1s, 2s, 4s, 8s, 16s, 32s, then capped at 60s.
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
      mockRandom.mockImplementation(() => 0); // the jittered half rolls its minimum

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

      // Ceiling after the 1st failure is 1_000ms. Even with the jittered half at 0, the guaranteed
      // half (500ms) must still elapse — full jitter would have allowed this to fire immediately.
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

      // This also resolves the success that follows (no backoff) and the failure after that,
      // all within the same microtask-flushing advance.
      await jest.advanceTimersByTimeAsync(2_000); // ceiling after the 2nd failure
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(4); // success, then 1st failure since reset

      // If the ceiling had kept growing instead of resetting, this would need 4_000ms, not 1_000ms.
      await jest.advanceTimersByTimeAsync(999);
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(4);
      await jest.advanceTimersByTimeAsync(1);
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(5);
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

    it('does not restart the watch loop after stop() aborts the in-flight request', async () => {
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
    });
  });
});

function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}
