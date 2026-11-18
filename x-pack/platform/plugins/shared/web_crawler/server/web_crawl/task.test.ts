/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { KibanaRequest } from '@kbn/core/server';
import type { ScopedClusterClientMock } from '@kbn/core/server/mocks';
import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { TaskCost, isUnrecoverableError } from '@kbn/task-manager-plugin/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { WEB_CRAWL_MAX_DEPTH_LIMIT, WEB_CRAWL_MAX_DOCUMENTS_LIMIT } from '../../common/constants';
import type { CrawlStorage, StoredCrawl } from './crawl_storage';
import { createCrawlStorage } from './crawl_storage';
import type { CrawlOptions, CrawlProgress, CrawlResult } from './crawler';
import { crawlSite } from './crawler';
import type { WebCrawlTaskParams } from './task';
import {
  PROGRESS_INTERVAL_MS,
  WEB_CRAWL_TASK_TYPE,
  registerWebCrawlTask,
  validateInteger,
} from './task';

jest.mock('./crawler');
jest.mock('./crawl_storage');

const mockCrawlSite = jest.mocked(crawlSite);
const mockCreateCrawlStorage = jest.mocked(createCrawlStorage);

const NOW = Date.parse('2026-03-01T12:00:00.000Z');
const TASK_ID = 'task-1';
const PARAMS: WebCrawlTaskParams = {
  url: 'https://example.com/',
  indexName: 'web-crawl-example.com',
  inferenceId: '.jina-reader',
  maxDepth: 3,
  maxDocuments: 250,
};

const STORED: StoredCrawl = {
  id: TASK_ID,
  url: PARAMS.url,
  index_name: PARAMS.indexName,
  status: 'running',
  max_depth: PARAMS.maxDepth,
  max_documents: PARAMS.maxDocuments,
  started_at: '2026-03-01T11:59:00.000Z',
  updated_at: '2026-03-01T11:59:00.000Z',
  documents_count: 0,
  failed_count: 0,
  requested_count: 0,
  queued_count: 0,
};

const PROGRESS: CrawlProgress = {
  documentsCount: 5,
  failedCount: 2,
  requestedCount: 9,
  queuedCount: 30,
};

const COMPLETED_RESULT: CrawlResult = { documentsCount: 12, failedCount: 1, aborted: false };

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

const createDeferred = <T>(): Deferred<T> => {
  let resolve: Deferred<T>['resolve'] = () => {};
  let reject: Deferred<T>['reject'] = () => {};
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe('validateInteger', () => {
  it.each([0, 1, 5, 1000, -3])('accepts %i', (value) => {
    expect(validateInteger(value)).toBeUndefined();
  });

  it.each([0.5, 2.5, -1.5, NaN, Infinity, -Infinity])('rejects %p', (value) => {
    expect(validateInteger(value)).toBe('must be an integer');
  });
});

describe('registerWebCrawlTask', () => {
  let core: ReturnType<typeof coreMock.createSetup>;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let taskManager: ReturnType<typeof taskManagerMock.createSetup>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let scopedClusterClient: ScopedClusterClientMock;
  let storage: jest.Mocked<CrawlStorage>;
  let fakeRequest: KibanaRequest;
  let abortController: AbortController;
  let crawl: Deferred<CrawlResult>;

  const getDefinition = () =>
    taskManager.registerTaskDefinitions.mock.calls[0][0][WEB_CRAWL_TASK_TYPE];

  const createRunner = ({ withFakeRequest = true }: { withFakeRequest?: boolean } = {}) =>
    getDefinition().createTaskRunner(
      taskManagerMock.createRunContext({
        taskInstance: taskManagerMock.createTask({
          id: TASK_ID,
          taskType: WEB_CRAWL_TASK_TYPE,
          params: PARAMS,
          state: {},
        }),
        fakeRequest: withFakeRequest ? fakeRequest : undefined,
        signal: abortController.signal,
      })
    );

  const flush = () => jest.advanceTimersByTimeAsync(0);
  const tick = (intervals: number = 1) =>
    jest.advanceTimersByTimeAsync(intervals * PROGRESS_INTERVAL_MS);

  /** Starts a run and waits until the crawl is under way. */
  const startRun = async () => {
    const outcome = createRunner()
      .run()
      .then(
        (value) => ({ value, error: undefined }),
        (error: Error) => ({ value: undefined, error })
      );
    await flush();
    expect(mockCrawlSite).toHaveBeenCalledTimes(1);
    return { outcome };
  };

  const getCrawlOptions = (): CrawlOptions => mockCrawlSite.mock.calls[0][0];

  const reportProgress = (progress: CrawlProgress) => getCrawlOptions().onProgress?.(progress);

  const getFinalWrite = () => {
    const finalWrites = storage.update.mock.calls.filter(([, patch]) => patch.status !== undefined);
    expect(finalWrites).toHaveLength(1);
    return finalWrites[0];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);

    core = coreMock.createSetup();
    coreStart = coreMock.createStart();
    taskManager = taskManagerMock.createSetup();
    logger = loggingSystemMock.createLogger();
    scopedClusterClient = elasticsearchServiceMock.createScopedClusterClient();
    fakeRequest = httpServerMock.createKibanaRequest();
    abortController = new AbortController();
    crawl = createDeferred<CrawlResult>();
    storage = {
      create: jest.fn(),
      get: jest.fn(),
      update: jest.fn().mockResolvedValue(STORED),
      find: jest.fn(),
      delete: jest.fn(),
    };

    jest.mocked(coreStart.elasticsearch.client.asScoped).mockReturnValue(scopedClusterClient);
    core.getStartServices.mockResolvedValue([
      coreStart,
      { taskManager: taskManagerMock.createStart() },
      {},
    ]);
    mockCreateCrawlStorage.mockReturnValue(storage);
    mockCrawlSite.mockReturnValue(crawl.promise);

    registerWebCrawlTask({ core, taskManager, logger });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('task definition', () => {
    it('registers a single web crawl task type', () => {
      expect(taskManager.registerTaskDefinitions).toHaveBeenCalledTimes(1);
      expect(Object.keys(taskManager.registerTaskDefinitions.mock.calls[0][0])).toEqual([
        'web_crawler:crawl',
      ]);
    });

    it('runs once, with a one hour timeout and a normal cost', () => {
      const { title, timeout, maxAttempts, cost } = getDefinition();

      expect(title).toEqual(expect.any(String));
      expect(timeout).toBe('1h');
      expect(maxAttempts).toBe(1);
      expect(cost).toBe(TaskCost.Normal);
    });

    describe('paramsSchema', () => {
      const validateParams = (params: unknown) => () =>
        getDefinition().paramsSchema?.validate(params);

      it('is defined', () => {
        expect(getDefinition().paramsSchema).toBeDefined();
      });

      it('accepts the crawl params', () => {
        expect(validateParams(PARAMS)()).toEqual(PARAMS);
      });

      it.each(['url', 'indexName', 'inferenceId', 'maxDepth', 'maxDocuments'] as const)(
        'requires %s',
        (key) => {
          expect(validateParams(omit(PARAMS, key))).toThrow(new RegExp(`\\[${key}\\]`));
        }
      );

      it.each([0, 1, 2, WEB_CRAWL_MAX_DEPTH_LIMIT])('accepts a maxDepth of %i', (maxDepth) => {
        expect(validateParams({ ...PARAMS, maxDepth })()).toEqual({ ...PARAMS, maxDepth });
      });

      it.each([-1, WEB_CRAWL_MAX_DEPTH_LIMIT + 1, 100])('rejects a maxDepth of %i', (maxDepth) => {
        expect(validateParams({ ...PARAMS, maxDepth })).toThrow(/\[maxDepth\]/);
      });

      it.each([1, 500, WEB_CRAWL_MAX_DOCUMENTS_LIMIT])(
        'accepts a maxDocuments of %i',
        (maxDocuments) => {
          expect(validateParams({ ...PARAMS, maxDocuments })()).toEqual({
            ...PARAMS,
            maxDocuments,
          });
        }
      );

      it.each([-1, 0, WEB_CRAWL_MAX_DOCUMENTS_LIMIT + 1, 100_000])(
        'rejects a maxDocuments of %i',
        (maxDocuments) => {
          expect(validateParams({ ...PARAMS, maxDocuments })).toThrow(/\[maxDocuments\]/);
        }
      );

      it.each([0.5, 2.5, 4.999, NaN, Infinity])(
        'rejects a non-integer maxDepth of %p',
        (maxDepth) => {
          expect(validateParams({ ...PARAMS, maxDepth })).toThrow(/\[maxDepth\]/);
        }
      );

      it.each([1.5, 10.5, 999.9, NaN, Infinity])(
        'rejects a non-integer maxDocuments of %p',
        (maxDocuments) => {
          expect(validateParams({ ...PARAMS, maxDocuments })).toThrow(/\[maxDocuments\]/);
        }
      );

      it('reports that a fractional limit must be an integer', () => {
        expect(validateParams({ ...PARAMS, maxDepth: 2.5 })).toThrow(/must be an integer/);
        expect(validateParams({ ...PARAMS, maxDocuments: 10.5 })).toThrow(/must be an integer/);
      });

      it('rejects non-numeric limits', () => {
        expect(validateParams({ ...PARAMS, maxDepth: 'deep' })).toThrow(/\[maxDepth\]/);
        expect(validateParams({ ...PARAMS, maxDocuments: null })).toThrow(/\[maxDocuments\]/);
      });

      it('bounds the limits to the documented maximums', () => {
        expect(WEB_CRAWL_MAX_DEPTH_LIMIT).toBe(5);
        expect(WEB_CRAWL_MAX_DOCUMENTS_LIMIT).toBe(1000);
      });

      it.each([
        ['url', 2048],
        ['indexName', 255],
        ['inferenceId', 512],
      ] as const)('bounds %s to %i characters', (key, maxLength) => {
        expect(validateParams({ ...PARAMS, [key]: 'a'.repeat(maxLength) })).not.toThrow();
        expect(validateParams({ ...PARAMS, [key]: 'a'.repeat(maxLength + 1) })).toThrow(
          /maximum length/
        );
      });

      it('rejects unknown params', () => {
        expect(validateParams({ ...PARAMS, depth: 5 })).toThrow(/\[depth\]/);
      });
    });
  });

  describe('task runner', () => {
    it('throws an unrecoverable error when the task has no fake request', async () => {
      const error = await createRunner({ withFakeRequest: false })
        .run()
        .then(
          () => undefined,
          (rejection: Error) => rejection
        );

      expect(error?.message).toMatch(/API key/);
      expect(error && isUnrecoverableError(error)).toBe(true);
      expect(mockCrawlSite).not.toHaveBeenCalled();
      expect(mockCreateCrawlStorage).not.toHaveBeenCalled();
      expect(jest.getTimerCount()).toBe(0);
    });

    it('crawls the site as the user the task was scheduled for', async () => {
      await startRun();

      expect(coreStart.elasticsearch.client.asScoped).toHaveBeenCalledWith(fakeRequest);
      expect(getCrawlOptions()).toEqual({
        esClient: scopedClusterClient.asCurrentUser,
        logger,
        signal: expect.any(AbortSignal),
        url: PARAMS.url,
        indexName: PARAMS.indexName,
        inferenceId: PARAMS.inferenceId,
        crawlId: TASK_ID,
        maxDepth: PARAMS.maxDepth,
        maxDocuments: PARAMS.maxDocuments,
        onProgress: expect.any(Function),
      });
      expect(getCrawlOptions().signal.aborted).toBe(false);
    });

    it('records the crawl state as the Kibana system user', async () => {
      await startRun();

      expect(mockCreateCrawlStorage).toHaveBeenCalledTimes(1);
      expect(mockCreateCrawlStorage).toHaveBeenCalledWith(
        coreStart.elasticsearch.client.asInternalUser,
        logger
      );
    });

    describe('outcome', () => {
      it('records a completed crawl with its final counts', async () => {
        const { outcome } = await startRun();
        reportProgress(PROGRESS);
        crawl.resolve(COMPLETED_RESULT);

        expect(await outcome).toEqual({ value: { state: {} }, error: undefined });

        expect(storage.update).toHaveBeenCalledTimes(1);
        expect(storage.update).toHaveBeenCalledWith(
          TASK_ID,
          {
            status: 'completed',
            documents_count: 12,
            failed_count: 1,
            requested_count: 9,
            queued_count: 0,
            updated_at: new Date(NOW).toISOString(),
            finished_at: new Date(NOW).toISOString(),
          },
          { refresh: true }
        );
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('records a failed crawl with the last reported counts, without failing the run', async () => {
        const { outcome } = await startRun();
        reportProgress(PROGRESS);
        crawl.reject(new Error('No content could be extracted'));

        expect(await outcome).toEqual({ value: { state: {} }, error: undefined });

        expect(getFinalWrite()).toEqual([
          TASK_ID,
          {
            status: 'failed',
            error: 'No content could be extracted',
            documents_count: 5,
            failed_count: 2,
            requested_count: 9,
            queued_count: 30,
            updated_at: new Date(NOW).toISOString(),
            finished_at: new Date(NOW).toISOString(),
          },
          { refresh: true },
        ]);
        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('No content could be extracted')
        );
      });

      it('stops the crawl when Task Manager aborts the task and records it as failed', async () => {
        const { outcome } = await startRun();

        abortController.abort();
        expect(getCrawlOptions().signal.aborted).toBe(true);
        crawl.resolve({ documentsCount: 4, failedCount: 0, aborted: true });

        expect((await outcome).value).toEqual({ state: {} });
        const [, patch] = getFinalWrite();
        expect(patch).toEqual(
          expect.objectContaining({
            status: 'failed',
            documents_count: 4,
            error: 'The crawl was stopped before it finished',
          })
        );
      });

      it('starts the crawl already stopped when the task was aborted before it ran', async () => {
        abortController.abort();

        await startRun();

        expect(getCrawlOptions().signal.aborted).toBe(true);
      });

      it('fails the run when the outcome cannot be recorded', async () => {
        storage.update.mockRejectedValue(new Error('index is read-only'));
        const { outcome } = await startRun();
        crawl.resolve(COMPLETED_RESULT);

        expect((await outcome).error?.message).toBe('index is read-only');
      });

      it('does not write an error for a completed crawl', async () => {
        const { outcome } = await startRun();
        crawl.resolve(COMPLETED_RESULT);
        await outcome;

        const [, patch] = getFinalWrite();
        expect(Object.keys(patch)).not.toContain('error');
      });
    });

    describe('progress', () => {
      it('writes nothing before the first interval has passed', async () => {
        await startRun();
        reportProgress(PROGRESS);

        await jest.advanceTimersByTimeAsync(PROGRESS_INTERVAL_MS - 1);

        expect(storage.update).not.toHaveBeenCalled();
      });

      it('writes the latest counts and a heartbeat on every interval', async () => {
        await startRun();

        await tick();
        reportProgress({ ...PROGRESS, documentsCount: 1 });
        reportProgress(PROGRESS);
        await tick();

        expect(storage.update.mock.calls).toEqual([
          [
            TASK_ID,
            {
              documents_count: 0,
              failed_count: 0,
              requested_count: 0,
              queued_count: 0,
              updated_at: new Date(NOW + PROGRESS_INTERVAL_MS).toISOString(),
            },
          ],
          [
            TASK_ID,
            {
              documents_count: 5,
              failed_count: 2,
              requested_count: 9,
              queued_count: 30,
              updated_at: new Date(NOW + 2 * PROGRESS_INTERVAL_MS).toISOString(),
            },
          ],
        ]);
      });

      it('does not start a write while the previous one is in flight', async () => {
        const slowWrite = createDeferred<StoredCrawl | undefined>();
        storage.update.mockReturnValueOnce(slowWrite.promise);
        await startRun();

        await tick(3);
        expect(storage.update).toHaveBeenCalledTimes(1);

        slowWrite.resolve(STORED);
        await tick();
        expect(storage.update).toHaveBeenCalledTimes(2);
      });

      it('keeps crawling and writing when a progress write fails', async () => {
        storage.update.mockRejectedValueOnce(new Error('cluster is busy'));
        const { outcome } = await startRun();

        await tick();
        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('cluster is busy'));
        expect(getCrawlOptions().signal.aborted).toBe(false);

        await tick();
        expect(storage.update).toHaveBeenCalledTimes(2);

        crawl.resolve(COMPLETED_RESULT);
        expect((await outcome).value).toEqual({ state: {} });
        expect(getFinalWrite()[1].status).toBe('completed');
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('keeps crawling when the crawl document is gone', async () => {
        storage.update.mockResolvedValue(undefined);
        await startRun();

        await tick();

        expect(getCrawlOptions().signal.aborted).toBe(false);
      });
    });

    describe('cancellation', () => {
      it('keeps crawling while no stop was requested', async () => {
        storage.update.mockResolvedValue({ ...STORED, cancel_requested: false });
        await startRun();

        await tick(2);

        expect(getCrawlOptions().signal.aborted).toBe(false);
      });

      it('stops the crawl once a stop was requested and records it as canceled', async () => {
        const { outcome } = await startRun();
        reportProgress(PROGRESS);
        storage.update.mockResolvedValueOnce({ ...STORED, cancel_requested: true });

        await tick();
        expect(getCrawlOptions().signal.aborted).toBe(true);
        crawl.resolve({ documentsCount: 5, failedCount: 2, aborted: true });

        expect((await outcome).value).toEqual({ state: {} });
        const [, patch, options] = getFinalWrite();
        expect(patch).toEqual({
          status: 'canceled',
          documents_count: 5,
          failed_count: 2,
          requested_count: 9,
          queued_count: 0,
          updated_at: new Date(NOW + PROGRESS_INTERVAL_MS).toISOString(),
          finished_at: new Date(NOW + PROGRESS_INTERVAL_MS).toISOString(),
        });
        expect(options).toEqual({ refresh: true });
      });

      it('records a canceled crawl as canceled when stopping it made it throw', async () => {
        const { outcome } = await startRun();
        storage.update.mockResolvedValueOnce({ ...STORED, cancel_requested: true });

        await tick();
        crawl.reject(new Error('The operation was aborted'));
        await outcome;

        const [, patch] = getFinalWrite();
        expect(patch.status).toBe('canceled');
        expect(Object.keys(patch)).not.toContain('error');
      });
    });

    describe('final write', () => {
      it('waits for a progress write that is still in flight', async () => {
        const slowWrite = createDeferred<StoredCrawl | undefined>();
        storage.update.mockReturnValueOnce(slowWrite.promise);
        const { outcome } = await startRun();
        let isSettled = false;
        outcome.then(() => {
          isSettled = true;
        });

        await tick();
        crawl.resolve(COMPLETED_RESULT);
        await flush();

        expect(storage.update).toHaveBeenCalledTimes(1);
        expect(isSettled).toBe(false);

        slowWrite.resolve(STORED);
        await outcome;

        expect(storage.update).toHaveBeenCalledTimes(2);
        const [progressPatch, finalPatch] = storage.update.mock.calls.map(([, patch]) => patch);
        expect(progressPatch.status).toBeUndefined();
        expect(finalPatch.status).toBe('completed');
      });

      it('is still written when the in-flight progress write fails', async () => {
        const slowWrite = createDeferred<StoredCrawl | undefined>();
        storage.update.mockReturnValueOnce(slowWrite.promise);
        const { outcome } = await startRun();

        await tick();
        crawl.resolve(COMPLETED_RESULT);
        await flush();
        slowWrite.reject(new Error('cluster is busy'));

        expect((await outcome).value).toEqual({ state: {} });
        expect(getFinalWrite()[1].status).toBe('completed');
      });
    });

    describe('cleanup', () => {
      const finishers: Array<[string, () => void]> = [
        ['completes', () => crawl.resolve(COMPLETED_RESULT)],
        ['fails', () => crawl.reject(new Error('boom'))],
        ['is aborted', () => crawl.resolve({ documentsCount: 0, failedCount: 0, aborted: true })],
        [
          'cannot record its outcome',
          () => {
            storage.update.mockRejectedValue(new Error('index is read-only'));
            crawl.resolve(COMPLETED_RESULT);
          },
        ],
      ];

      it.each(finishers)('stops recording progress once the crawl %s', async (_, finish) => {
        const { outcome } = await startRun();
        expect(jest.getTimerCount()).toBe(1);

        finish();
        await outcome;
        const writesAtTheEnd = storage.update.mock.calls.length;

        expect(jest.getTimerCount()).toBe(0);
        await tick(3);
        expect(storage.update).toHaveBeenCalledTimes(writesAtTheEnd);
      });

      it.each(finishers)(
        'stops listening to the task signal once the crawl %s',
        async (_, finish) => {
          const removeEventListener = jest.spyOn(abortController.signal, 'removeEventListener');
          const { outcome } = await startRun();

          finish();
          await outcome;
          abortController.abort();

          expect(removeEventListener).toHaveBeenCalledWith('abort', expect.any(Function));
          expect(getCrawlOptions().signal.aborted).toBe(false);
        }
      );
    });
  });
});
