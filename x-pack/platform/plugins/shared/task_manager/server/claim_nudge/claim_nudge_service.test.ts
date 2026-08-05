/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { TaskManagerClaimNudgeService } from './claim_nudge_service';

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
  });

  describe('notify()', () => {
    it('writes the claim nudge doc to a fixed id with refresh:true', async () => {
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
        refresh: true,
      });
    });

    it('generates a new nonce on every call', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      await service.notify();
      await service.notify();

      const [{ document: firstDocument }] = (esClient.index as jest.Mock).mock.calls[0];
      const [{ document: secondDocument }] = (esClient.index as jest.Mock).mock.calls[1];
      expect(firstDocument).not.toEqual(secondDocument);
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

    it('creates the signal index so the long-poll has something to watch', async () => {
      const esClient = createEsClientMock();
      const { service } = createService({ esClient });

      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(async () => {
        service.stop();
        return { global_checkpoints: [1], timed_out: false };
      });

      service.start();
      await flushPromises();

      expect(esClient.indices.create).toHaveBeenCalledTimes(1);
    });

    it('emits for a nudge written while arming on an index it just created', async () => {
      const esClient = createEsClientMock();
      (esClient.indices.create as jest.Mock).mockResolvedValue(undefined);
      const { service } = createService({ esClient });

      // A notify() that lands before the watcher's first request has already advanced the
      // checkpoint, so the very first response must count as an advance rather than a baseline.
      (esClient.fleet.globalCheckpoints as jest.Mock).mockImplementation(async () => {
        service.stop();
        return { global_checkpoints: [0], timed_out: false };
      });

      const nudgeSpy = jest.fn();
      service.claimNudge$.subscribe(nudgeSpy);

      service.start();
      await flushPromises();

      expect(esClient.fleet.globalCheckpoints).toHaveBeenCalledWith(
        expect.objectContaining({ checkpoints: [-1] }),
        expect.anything()
      );
      expect(nudgeSpy).toHaveBeenCalledTimes(1);
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
