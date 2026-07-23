/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { TaskManagerClaimNudgeService } from './claim_nudge_service';
import { TASK_MANAGER_CLAIM_NUDGE_SO_NAME } from '../saved_objects';

const INDEX = '.kibana_task_manager_claim_nudge';

function createService({
  esClient,
  logger = loggingSystemMock.createLogger(),
  savedObjectsRepository = savedObjectsRepositoryMock.create(),
}: {
  esClient: ElasticsearchClient;
  logger?: ReturnType<typeof loggingSystemMock.createLogger>;
  savedObjectsRepository?: ReturnType<typeof savedObjectsRepositoryMock.create>;
}) {
  return {
    service: new TaskManagerClaimNudgeService({
      logger,
      esClient,
      savedObjectsRepository,
      index: INDEX,
    }),
    logger,
    savedObjectsRepository,
  };
}

function createEsClientMock() {
  return {
    fleet: {
      globalCheckpoints: jest.fn(),
    },
  } as unknown as ElasticsearchClient;
}

describe('TaskManagerClaimNudgeService', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('notify()', () => {
    it('writes the claim nudge doc with overwrite and refresh:true', async () => {
      const esClient = createEsClientMock();
      const { service, savedObjectsRepository } = createService({ esClient });

      await service.notify();

      expect(savedObjectsRepository.create).toHaveBeenCalledWith(
        TASK_MANAGER_CLAIM_NUDGE_SO_NAME,
        expect.objectContaining({
          updated_at: expect.any(String),
          nonce: expect.any(String),
        }),
        {
          id: 'global',
          overwrite: true,
          refresh: true,
        }
      );
    });

    it('generates a new nonce on every call', async () => {
      const esClient = createEsClientMock();
      const { service, savedObjectsRepository } = createService({ esClient });

      await service.notify();
      await service.notify();

      const [, firstCallAttrs] = savedObjectsRepository.create.mock.calls[0];
      const [, secondCallAttrs] = savedObjectsRepository.create.mock.calls[1];
      expect(firstCallAttrs).not.toEqual(secondCallAttrs);
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

    it('is a no-op when called while already started', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(async () => {
        // Yield a microtask before stopping, so the reentrant `start()` call below observes
        // `started === true`, exercising the no-op guard rather than racing past it (unlike
        // a real ES call, which can never resolve synchronously).
        await Promise.resolve();
        service.stop();
        return { global_checkpoints: [1], timed_out: false };
      });

      service.start();
      service.start();
      await flushPromises();

      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(1);
    });

    it('retries after a delay when the request throws, and recovers', async () => {
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
      await flushPromises();
      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('ES temporarily unavailable')
      );

      // The service waits ~1s before retrying; wait past that in real time.
      await new Promise((resolve) => setTimeout(resolve, 1_200));

      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledTimes(2);
    }, 10_000);

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
