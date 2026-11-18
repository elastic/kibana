/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import {
  coreMock,
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import {
  WEB_CRAWL_DEFAULT_MAX_DEPTH,
  WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
} from '../../common/constants';
import {
  WEB_CRAWL_STEP_ID,
  webCrawlStepCommonDefinition,
  webCrawlStepOutputSchema,
} from '../../common/web_crawl_step';
import { WebCrawlError, cancelCrawl, getCrawl, startCrawl } from './crawl_service';
import type { CrawlStorage, StoredCrawl } from './crawl_storage';
import { createCrawlStorage } from './crawl_storage';
import { getWebCrawlStepDefinition } from './workflow_step';

jest.mock('./crawl_storage');
jest.mock('./crawl_service', () => ({
  ...jest.requireActual('./crawl_service'),
  startCrawl: jest.fn(),
  getCrawl: jest.fn(),
  cancelCrawl: jest.fn(),
}));

const mockCreateCrawlStorage = jest.mocked(createCrawlStorage);
const mockStartCrawl = jest.mocked(startCrawl);
const mockGetCrawl = jest.mocked(getCrawl);
const mockCancelCrawl = jest.mocked(cancelCrawl);

const CRAWL_URL = 'https://example.com/';
const CRAWL_ID = 'crawl-1';
const WORKFLOW_ID = 'workflow-1';

const RUNNING: StoredCrawl = {
  id: CRAWL_ID,
  url: CRAWL_URL,
  index_name: 'web-crawl-example.com',
  status: 'running',
  max_depth: 2,
  max_documents: 500,
  started_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:03.000Z',
  documents_count: 4,
  failed_count: 1,
  requested_count: 9,
  queued_count: 20,
};

type StepDefinition = ReturnType<typeof getWebCrawlStepDefinition>;
type StartContext = Parameters<NonNullable<StepDefinition['start']>>[0];
type PollContext = Parameters<StepDefinition['poll']>[0];
type StepInput = StartContext['input'];
type StepState = PollContext['state'];

describe('getWebCrawlStepDefinition', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let taskManager: ReturnType<typeof taskManagerMock.createStart>;
  let scopedEsClient: ElasticsearchClientMock;
  let storage: jest.Mocked<CrawlStorage>;
  let fakeRequest: KibanaRequest;
  let getStartServices: jest.Mock;
  let definition: StepDefinition;

  const createStartContext = (input: StepInput = { url: CRAWL_URL }) =>
    ({
      input,
      rawInput: input,
      config: {},
      contextManager: {
        getContext: jest.fn().mockReturnValue({
          workflow: { id: WORKFLOW_ID },
          execution: { id: 'execution-1', executedBy: 'elastic' },
        }),
        getScopedEsClient: jest.fn().mockReturnValue(scopedEsClient),
        getFakeRequest: jest.fn().mockReturnValue(fakeRequest),
        renderInputTemplate: jest.fn(),
      },
      logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      abortSignal: new AbortController().signal,
      stepId: 'crawl',
      stepType: WEB_CRAWL_STEP_ID,
    } as unknown as StartContext);

  const createPollContext = (state: StepState): PollContext => ({
    ...createStartContext(),
    state,
    attempt: 0,
  });

  const getExpectedDeps = () => ({ esClient: scopedEsClient, storage, taskManager, logger });

  const start = (input?: StepInput) => {
    if (!definition.start) {
      throw new Error('Expected the step to define a start phase');
    }
    return definition.start(createStartContext(input));
  };

  const poll = (state: StepState = { crawl_id: CRAWL_ID }) =>
    definition.poll(createPollContext(state));

  beforeEach(() => {
    jest.clearAllMocks();
    logger = loggingSystemMock.createLogger();
    coreStart = coreMock.createStart();
    taskManager = taskManagerMock.createStart();
    scopedEsClient = elasticsearchServiceMock.createElasticsearchClient();
    fakeRequest = httpServerMock.createKibanaRequest();
    storage = {
      create: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };
    getStartServices = jest.fn().mockResolvedValue([coreStart, { taskManager }, {}]);

    mockCreateCrawlStorage.mockReturnValue(storage);
    mockStartCrawl.mockResolvedValue(RUNNING);
    mockGetCrawl.mockResolvedValue(RUNNING);
    mockCancelCrawl.mockResolvedValue({ ...RUNNING, cancel_requested: true });

    definition = getWebCrawlStepDefinition({ getStartServices, logger });
  });

  describe('definition', () => {
    it('extends the common step definition', () => {
      expect(definition.id).toBe('webCrawl.run');
      expect(definition).toEqual(expect.objectContaining(webCrawlStepCommonDefinition));
    });

    it('polls every 15 seconds for longer than the crawl task may run', () => {
      expect(definition.policy).toEqual({ strategy: 'fixed', intervalMs: 15_000 });
      expect(definition.ceilings).toEqual({ maxAttempts: 300, maxWaitMs: 15_000 });
      expect((definition.ceilings?.maxAttempts ?? 0) * 15_000).toBeGreaterThan(60 * 60_000);
    });

    it('does not resolve the start services until a phase runs', () => {
      expect(getStartServices).not.toHaveBeenCalled();
      expect(mockCreateCrawlStorage).not.toHaveBeenCalled();
    });
  });

  describe('start', () => {
    it('starts the crawl as the user of the workflow and keeps its ID as state', async () => {
      await expect(start({ url: CRAWL_URL, max_depth: 4, max_documents: 50 })).resolves.toEqual({
        state: { crawl_id: CRAWL_ID },
      });

      expect(mockStartCrawl).toHaveBeenCalledTimes(1);
      expect(mockStartCrawl).toHaveBeenCalledWith(getExpectedDeps(), {
        request: fakeRequest,
        url: CRAWL_URL,
        maxDepth: 4,
        maxDocuments: 50,
        startedBy: 'elastic',
        workflowId: WORKFLOW_ID,
      });
    });

    it('records the crawl state as the Kibana system user', async () => {
      await start();

      expect(mockCreateCrawlStorage).toHaveBeenCalledWith(
        coreStart.elasticsearch.client.asInternalUser,
        logger
      );
    });

    it('applies the default limits', async () => {
      await start({ url: CRAWL_URL });

      expect(mockStartCrawl.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          maxDepth: WEB_CRAWL_DEFAULT_MAX_DEPTH,
          maxDocuments: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS,
        })
      );
    });

    it('applies each default limit independently', async () => {
      await start({ url: CRAWL_URL, max_depth: 0 });
      await start({ url: CRAWL_URL, max_documents: 1 });

      const [[, depthOnly], [, documentsOnly]] = mockStartCrawl.mock.calls;
      expect(depthOnly).toEqual(
        expect.objectContaining({ maxDepth: 0, maxDocuments: WEB_CRAWL_DEFAULT_MAX_DOCUMENTS })
      );
      expect(documentsOnly).toEqual(
        expect.objectContaining({ maxDepth: WEB_CRAWL_DEFAULT_MAX_DEPTH, maxDocuments: 1 })
      );
    });

    it.each([
      [400, 'Enter a valid http or https URL'],
      [403, 'Missing the write privilege on web-crawl-example.com'],
      [409, 'A crawl into web-crawl-example.com is already running'],
    ] as const)('fails with the %i "%s" from the crawl service', async (statusCode, message) => {
      const error = new WebCrawlError(message, statusCode);
      mockStartCrawl.mockRejectedValue(error);

      await expect(start()).rejects.toBe(error);
    });

    it('fails when the start services cannot be resolved', async () => {
      getStartServices.mockRejectedValue(new Error('not started'));

      await expect(start()).rejects.toThrow('not started');

      expect(mockStartCrawl).not.toHaveBeenCalled();
    });
  });

  describe('poll', () => {
    it('reads the crawl as the user of the workflow', async () => {
      await poll();

      expect(mockGetCrawl).toHaveBeenCalledWith(getExpectedDeps(), CRAWL_ID);
    });

    it('keeps polling while the crawl is running', async () => {
      await expect(poll()).resolves.toBeUndefined();
    });

    it('keeps polling while the crawl is stopping', async () => {
      mockGetCrawl.mockResolvedValue({ ...RUNNING, cancel_requested: true });

      await expect(poll()).resolves.toBeUndefined();
    });

    it.each(['completed', 'canceled'] as const)(
      'returns the outcome of a %s crawl',
      async (status) => {
        mockGetCrawl.mockResolvedValue({
          ...RUNNING,
          status,
          documents_count: 42,
          failed_count: 3,
          finished_at: '2026-01-01T00:10:00.000Z',
        });

        const result = await poll();

        expect(result).toEqual({
          output: {
            crawl_id: CRAWL_ID,
            index_name: 'web-crawl-example.com',
            status,
            documents_count: 42,
            failed_count: 3,
          },
        });
        expect(webCrawlStepOutputSchema.safeParse(result?.output).success).toBe(true);
      }
    );

    it('fails the step with the error of a failed crawl', async () => {
      mockGetCrawl.mockResolvedValue({
        ...RUNNING,
        status: 'failed',
        error: 'No content could be extracted',
      });

      const result = await poll();

      expect(result).toEqual({ error: expect.any(Error) });
      expect(result?.error?.message).toBe('No content could be extracted');
      expect(result?.output).toBeUndefined();
    });

    it('fails the step with a fallback message when the failed crawl recorded no error', async () => {
      mockGetCrawl.mockResolvedValue({ ...RUNNING, status: 'failed' });

      const result = await poll();

      expect(result?.error?.message).toBe(`The crawl of ${CRAWL_URL} failed`);
    });

    it('throws when it is polled without a crawl', async () => {
      await expect(definition.poll(createPollContext(undefined))).rejects.toThrow(
        'The crawl step was polled before it started a crawl'
      );

      expect(mockGetCrawl).not.toHaveBeenCalled();
    });

    it('throws when the crawl can no longer be read', async () => {
      const error = new WebCrawlError(`No crawl found with ID ${CRAWL_ID}`, 404);
      mockGetCrawl.mockRejectedValue(error);

      await expect(poll()).rejects.toBe(error);
    });
  });

  describe('onCancel', () => {
    it('asks the crawl to stop as the user of the workflow', async () => {
      await definition.onCancel?.(createPollContext({ crawl_id: CRAWL_ID }));

      expect(mockCancelCrawl).toHaveBeenCalledTimes(1);
      expect(mockCancelCrawl).toHaveBeenCalledWith(getExpectedDeps(), CRAWL_ID);
    });

    it('does nothing when the step was canceled before it started a crawl', async () => {
      await definition.onCancel?.(createPollContext(undefined));
      await definition.onCancel?.(createStartContext() as PollContext);

      expect(getStartServices).not.toHaveBeenCalled();
      expect(mockCancelCrawl).not.toHaveBeenCalled();
    });

    it('surfaces a failure to stop the crawl', async () => {
      const error = new WebCrawlError('Missing the write privilege on web-crawl-example.com', 403);
      mockCancelCrawl.mockRejectedValue(error);

      await expect(definition.onCancel?.(createPollContext({ crawl_id: CRAWL_ID }))).rejects.toBe(
        error
      );
    });
  });
});
